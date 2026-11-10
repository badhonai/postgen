import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {ROOT} from '../tools/lib.mjs'
import {readZip, writeZip} from '../tools/zip.mjs'

const handoff = (args) => {
  try {
    return {ok: true, out: execFileSync(process.execPath, [path.join(ROOT, 'tools/handoff.mjs'), ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })}
  } catch (error) {
    return {ok: false, out: `${error.stdout ?? ''}${error.stderr ?? ''}`, status: error.status}
  }
}

const tmp = (name) => {
  const dir = path.join(ROOT, '.cache', 'handoff-test')
  fs.mkdirSync(dir, {recursive: true})
  return path.join(dir, name)
}

const zipOf = (file, entries) => {
  fs.writeFileSync(file, writeZip(entries.map(([name, text]) => ({name, data: Buffer.from(text)}))))
  return file
}

const project = 'fluton-private-actions'
const packFile = tmp('pack.zip')

test('pack is reproducible and carries the recorded voice, never the mix', () => {
  const first = handoff(['pack', project, `--out=${packFile}`])
  assert.ok(first.ok, first.out)
  const second = handoff(['pack', project, `--out=${packFile}`])
  assert.equal(first.out.match(/sha256 (\w+)/)[1], second.out.match(/sha256 (\w+)/)[1], 'same inputs must give the same archive')

  const files = readZip(fs.readFileSync(packFile))
  assert.ok(files.has('production/narration.mp3'), 'the voice is the timing source of truth')
  assert.ok(files.has('CLAUDE-PROMPT.md') && files.has('HANDOFF.json') && files.has('VISUAL-RETURN.md'))
  assert.ok(files.has('src/film-data.json') && files.has('src/Composition.tsx'), 'frozen files ship as read-only baseline')
  for (const name of files.keys()) {
    assert.ok(!/\.wav$|\.mp4$|node_modules|^public\//.test(name), `pack must not contain ${name}`)
  }
  const manifest = JSON.parse(files.get('HANDOFF.json').toString('utf8'))
  assert.equal(manifest.spec.fps, 60)
  assert.ok(manifest.locked['src/timeline.ts'].sha256, 'frozen files are hashed in the manifest')
  assert.match(String(files.get('CLAUDE-PROMPT.md')), /scene windows/i)
})

test('a return with only allowed files is accepted and staged, not applied', () => {
  const file = zipOf(tmp('good.zip'), [
    ['src/scenes/Exposure.tsx', 'export const Scene = () => null\n'],
    ['src/components/Item.tsx', 'export const Item = () => null\n'],
    ['VISUAL-RETURN.md', '# VISUAL-RETURN\nmore contrast on the trace\n'],
  ])
  const run = handoff(['import', project, file])
  assert.ok(run.ok, run.out)
  assert.match(run.out, /3 entries accepted/)
  assert.match(run.out, /nothing written to the project yet/)
  const staged = path.join(ROOT, '.cache', project, 'import/src/scenes/Exposure.tsx')
  assert.equal(fs.readFileSync(staged, 'utf8'), 'export const Scene = () => null\n')
  // the project itself is untouched until --apply
  const live = fs.readFileSync(path.join(ROOT, 'projects', project, 'src/scenes/Exposure.tsx'), 'utf8')
  assert.notEqual(live, 'export const Scene = () => null\n')
})

test('a return that touches the timing agreement is refused', () => {
  const file = zipOf(tmp('frozen.zip'), [
    ['src/Film.tsx', 'export const Film = () => null\n'],
    ['src/timeline.ts', 'export type FilmScene = { id: string }\n'],
    ['project.json', '{"fps":30}\n'],
    ['package.json', '{"dependencies":{"left-pad":"1.0.0"}}\n'],
  ])
  const run = handoff(['import', project, file, '--apply'])
  assert.equal(run.ok, false)
  assert.match(run.out, /frozen/)
  assert.match(run.out, /timeline types are owned by the orchestrator/)
  assert.match(run.out, /dependencies need an explicit decision/)
  const live = fs.readFileSync(path.join(ROOT, 'projects', project, 'src/Film.tsx'), 'utf8')
  assert.ok(!live.startsWith('export const Film = () => null'), 'a refused archive writes nothing')
})

test('a return with files outside the contract is refused', () => {
  const file = zipOf(tmp('stray.zip'), [
    ['src/Film.tsx', 'export const Film = () => null\n'],
    ['public/logo.png', 'x'],
    ['README-INSTALL.md', 'run npm i\n'],
  ])
  const run = handoff(['import', project, file])
  assert.equal(run.ok, false)
  assert.match(run.out, /not part of the return contract/)
})

test('path traversal inside a returned archive is refused', () => {
  const file = zipOf(tmp('traversal.zip'), [
    ['src/Film.tsx', 'x'],
    ['../../etc/passwd', 'x'],
  ])
  const run = handoff(['import', project, file])
  assert.equal(run.ok, false)
  assert.match(run.out, /traversal|unsafe path/)
})

test('a return with no editable source is refused', () => {
  const file = zipOf(tmp('empty.zip'), [['VISUAL-RETURN.md', '# nothing\n']])
  const run = handoff(['import', project, file])
  assert.equal(run.ok, false)
  assert.match(run.out, /no editable source/)
})

test('credentials are never packed', () => {
  const dir = path.join(ROOT, 'projects', project)
  const probe = path.join(dir, 'brief.md')
  const original = fs.readFileSync(probe, 'utf8')
  try {
    fs.writeFileSync(probe, original + '\nkey: pgk_live_abcdefghijklmnop\n')
    const run = handoff(['pack', project, `--out=${tmp('secret.zip')}`])
    assert.equal(run.ok, false)
    assert.match(run.out, /PostGen agent key/)
  } finally {
    fs.writeFileSync(probe, original)
  }
})
