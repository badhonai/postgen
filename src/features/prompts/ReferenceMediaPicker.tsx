import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAllAssetsByProject } from './api'
import AssetThumb from '../../features/media/AssetThumb'
import MediaUploader from '../../features/media/MediaUploader'
import { Button, Card, Spinner } from '../../components/ui'
import type { Asset } from '../../lib/types'

/**
 * Picks reference media for an image prompt. Unlike AssetPickerDialog this
 * is not bound to one project — prompts are shared across projects, so the
 * references can come from anywhere in the user's library. Selecting is a
 * toggle, not a one-shot, because a prompt can carry several references.
 */
export default function ReferenceMediaPicker({
  selectedIds,
  onChange,
  onClose,
}: {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onClose: () => void
}) {
  const qc = useQueryClient()
  const groups = useAllAssetsByProject()
  const [projectId, setProjectId] = useState<string>('')
  const [draft, setDraft] = useState<string[]>(selectedIds)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const visible = projectId
    ? (groups.data ?? []).filter((g) => g.projectId === projectId)
    : (groups.data ?? [])

  const toggle = (asset: Asset) => {
    setDraft((cur) => (cur.includes(asset.id) ? cur.filter((x) => x !== asset.id) : [...cur, asset.id]))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 backdrop-blur-sm sm:items-center">
      <Card className="pg-glass-strong max-h-[92dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[32px] p-5 pb-10 sm:rounded-[28px]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="pg-title text-xl text-ink">Reference media</h2>
          <button
            type="button"
            aria-label="Close"
            className="pg-glass flex h-9 w-9 items-center justify-center rounded-full text-ink"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs font-semibold text-ink-soft">
          Images that show the style this prompt should produce. The agent gets the prompt and these
          together.
        </p>

        <div className="mt-4">
          <MediaUploader
            projectId={projectId || (groups.data ?? [])[0]?.projectId || ''}
            onUploaded={(asset) => {
              // a fresh upload is a reference by definition — select it
              setDraft((cur) => (cur.includes(asset.id) ? cur : [...cur, asset.id]))
              void qc.invalidateQueries({ queryKey: ['all-assets-by-project'] })
            }}
          />
        </div>

        {(groups.data ?? []).length > 1 ? (
          <div className="pg-glass mt-3 flex gap-1 rounded-full p-1">
            <button
              type="button"
              onClick={() => setProjectId('')}
              className={`flex-1 rounded-full px-2 py-1.5 text-[12px] font-extrabold transition ${
                projectId === '' ? 'bg-butter text-ink' : 'text-ink-soft'
              }`}
            >
              All
            </button>
            {(groups.data ?? []).map((g) => (
              <button
                key={g.projectId}
                type="button"
                onClick={() => setProjectId(g.projectId)}
                className={`flex-1 truncate rounded-full px-2 py-1.5 text-[12px] font-extrabold transition ${
                  projectId === g.projectId ? 'bg-butter text-ink' : 'text-ink-soft'
                }`}
              >
                {g.projectName}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-4 space-y-4">
          {groups.isPending ? (
            <Spinner />
          ) : (groups.data ?? []).length === 0 ? (
            <p className="text-sm font-semibold text-ink-soft">
              No media yet — upload one above to use it as a reference.
            </p>
          ) : (
            visible.map((g) => (
              <div key={g.projectId}>
                <p className="mb-2 text-[11px] font-extrabold tracking-[0.12em] text-ink-soft uppercase">
                  {g.projectName}
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {g.assets.map((asset) => {
                    const on = draft.includes(asset.id)
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(asset)}
                        className={`relative overflow-hidden rounded-[16px] border-2 transition active:scale-95 ${
                          on ? 'border-ink' : 'border-transparent'
                        }`}
                      >
                        <AssetThumb asset={asset} />
                        {on ? (
                          <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">
                            ✓
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <span className="text-xs font-bold text-ink-soft">
            {draft.length} selected
          </span>
          <Button className="ml-auto" onClick={() => onChange(draft)}>
            Use these
          </Button>
        </div>
      </Card>
    </div>
  )
}
