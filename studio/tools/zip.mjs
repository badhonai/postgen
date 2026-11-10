/**
 * Minimal, deterministic ZIP reader/writer (no dependencies, no shelling out).
 *
 * Only what the handoff needs: a flat archive of regular files, deflated when that
 * helps. Entry timestamps are pinned so packing the same inputs twice yields the
 * same bytes — that is what makes a handoff reviewable by hash.
 */
import crypto from 'node:crypto'
import zlib from 'node:zlib'

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  return table
})()

export function crc32(buffer) {
  let c = -1
  for (let i = 0; i < buffer.length; i++) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

/** Fixed DOS timestamp (1980-01-01 00:00) so archives are reproducible. */
const DOS_TIME = 0
const DOS_DATE = (0 << 9) | (1 << 5) | 1

const UTF8_FLAG = 0x0800

/**
 * @param {Array<{name: string, data: Buffer}>} entries
 * @returns {Buffer}
 */
export function writeZip(entries) {
  const locals = []
  const centrals = []
  let offset = 0

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8')
    const crc = crc32(data)
    const deflated = zlib.deflateRawSync(data, { level: 9 })
    const useDeflate = deflated.length < data.length
    const body = useDeflate ? deflated : data
    const method = useDeflate ? 8 : 0

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(UTF8_FLAG, 6)
    local.writeUInt16LE(method, 8)
    local.writeUInt16LE(DOS_TIME, 10)
    local.writeUInt16LE(DOS_DATE, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(body.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    local.writeUInt16LE(0, 28)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(UTF8_FLAG, 8)
    central.writeUInt16LE(method, 10)
    central.writeUInt16LE(DOS_TIME, 12)
    central.writeUInt16LE(DOS_DATE, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(body.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt32LE(0, 38) // external attributes: regular file, 0644
    central.writeUInt32LE(offset, 42)

    locals.push(local, nameBuf, body)
    centrals.push(central, nameBuf)
    offset += local.length + nameBuf.length + body.length
  }

  const centralBuf = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralBuf.length, 12)
  eocd.writeUInt32LE(offset, 16)

  return Buffer.concat([...locals, centralBuf, eocd])
}

/**
 * Reads every entry. Refuses the archive shapes a handoff must never accept:
 * absolute paths, `..`, backslashes, symlinks, duplicates and zip bombs.
 *
 * @param {Buffer} buffer
 * @param {{maxEntryBytes?: number, maxTotalBytes?: number}} limits
 * @returns {Map<string, Buffer>}
 */
export function readZip(buffer, { maxEntryBytes = 8 * 1024 * 1024, maxTotalBytes = 32 * 1024 * 1024 } = {}) {
  const eocdOffset = findEocd(buffer)
  const count = buffer.readUInt16LE(eocdOffset + 10)
  const cdSize = buffer.readUInt32LE(eocdOffset + 12)
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16)
  if (count === 0xffff || cdOffset === 0xffffffff) throw new Error('ZIP64 archives are not supported.')
  if (cdOffset + cdSize > buffer.length) throw new Error('Corrupt ZIP: central directory outside the file.')

  const files = new Map()
  let total = 0
  let cursor = cdOffset

  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Corrupt ZIP: bad central directory entry.')
    const flags = buffer.readUInt16LE(cursor + 8)
    const method = buffer.readUInt16LE(cursor + 10)
    const compressedSize = buffer.readUInt32LE(cursor + 20)
    const uncompressedSize = buffer.readUInt32LE(cursor + 24)
    const nameLength = buffer.readUInt16LE(cursor + 28)
    const extraLength = buffer.readUInt16LE(cursor + 30)
    const commentLength = buffer.readUInt16LE(cursor + 32)
    const externalAttrs = buffer.readUInt32LE(cursor + 38)
    const localOffset = buffer.readUInt32LE(cursor + 42)
    const name = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLength)
    cursor += 46 + nameLength + extraLength + commentLength

    if (flags & 0x1) throw new Error('Encrypted ZIP entries are not supported.')
    if (name.endsWith('/')) continue // directory marker

    const unixMode = externalAttrs >>> 16
    if ((unixMode & 0o170000) === 0o120000) throw new Error(`Refusing symlink entry: ${name}`)
    if (/^(\/|\\|[A-Za-z]:)/.test(name) || name.includes('\\')) throw new Error(`Refusing unsafe path: ${name}`)
    if (name.split('/').includes('..')) throw new Error(`Refusing path traversal: ${name}`)
    if (files.has(name)) throw new Error(`Duplicate entry: ${name}`)

    if (uncompressedSize > maxEntryBytes) throw new Error(`Entry too large (${uncompressedSize} bytes): ${name}`)
    if (compressedSize > 0 && uncompressedSize / compressedSize > 200 && uncompressedSize > 1024 * 1024) {
      throw new Error(`Refusing suspicious compression ratio: ${name}`)
    }
    total += uncompressedSize
    if (total > maxTotalBytes) throw new Error('Archive expands beyond the handoff size budget.')

    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error(`Corrupt local header: ${name}`)
    const localNameLength = buffer.readUInt16LE(localOffset + 26)
    const localExtraLength = buffer.readUInt16LE(localOffset + 28)
    const start = localOffset + 30 + localNameLength + localExtraLength
    const body = buffer.subarray(start, start + compressedSize)

    let data
    if (method === 0) data = Buffer.from(body)
    else if (method === 8) data = zlib.inflateRawSync(body)
    else throw new Error(`Unsupported compression method ${method}: ${name}`)
    if (data.length !== uncompressedSize) throw new Error(`Size mismatch after inflate: ${name}`)
    files.set(name, data)
  }

  return files
}

function findEocd(buffer) {
  const min = Math.max(0, buffer.length - 0xffff - 22)
  for (let i = buffer.length - 22; i >= min; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) return i
  }
  throw new Error('Not a ZIP file (no end-of-central-directory record).')
}

export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex')
}

/** A manifest row — path, size and hash only, never file contents. */
export function describe(name, data) {
  return { path: name, bytes: data.length, sha256: sha256(data) }
}
