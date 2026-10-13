import { useRef, useState } from 'react'
import { uploadAsset } from '../../lib/media'
import type { Asset } from '../../lib/types'
import { cn } from '../../lib/cn'

type UploadEntry = {
  id: string
  name: string
  status: 'uploading' | 'done' | 'error'
  error?: string
}

export default function MediaUploader({
  projectId,
  onUploaded,
}: {
  projectId: string
  onUploaded?: (asset: Asset) => void
}) {
  const [entries, setEntries] = useState<UploadEntry[]>([])
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (list: FileList | File[]) => {
    for (const file of Array.from(list)) {
      const id = crypto.randomUUID()
      setEntries((prev) => [...prev, { id, name: file.name, status: 'uploading' }])
      try {
        const asset = await uploadAsset(file, projectId)
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'done' } : e)))
        onUploaded?.(asset)
      } catch (err) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id
              ? { ...e, status: 'error', error: err instanceof Error ? err.message : 'failed' }
              : e,
          ),
        )
      }
    }
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
          dragOver ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800 hover:border-zinc-600',
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        role="button"
        tabIndex={0}
      >
        <span className="text-2xl">📎</span>
        <p className="mt-2 text-sm text-zinc-300">
          Drag &amp; drop, or <span className="text-emerald-400">browse</span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Images ≤ 10 MB (png, jpg, gif, webp, avif) · Videos ≤ 50 MB (mp4, webm, mov)
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/gif,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {entries.length > 0 ? (
        <ul className="space-y-1.5">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-xs">
              <span
                className={
                  e.status === 'done'
                    ? 'text-emerald-400'
                    : e.status === 'error'
                      ? 'text-red-400'
                      : 'text-zinc-500'
                }
              >
                {e.status === 'done' ? '✓' : e.status === 'error' ? '✗' : '◌'}
              </span>
              <span className="min-w-0 flex-1 truncate text-zinc-300">{e.name}</span>
              {e.error ? <span className="text-red-400">{e.error}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
