import { useState } from 'react'
import type { ImagePrompt } from './api'
import { Button } from '../../components/ui'
import { RefThumbRow } from './PromptCard'

type Props = {
  prompt: ImagePrompt
  projectNames?: string[]
  deletePending: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onSend?: () => void
}

/**
 * What a card opens: the whole prompt, its notes and its references, with edit
 * and delete one tap away. The list never has to grow to fit any of this.
 */
export default function PromptDetailSheet({
  prompt,
  projectNames = [],
  deletePending,
  onClose,
  onEdit,
  onDelete,
  onSend,
}: Props) {
  const refs = prompt.reference_asset_ids ?? []
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/35 backdrop-blur-[2px]"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={prompt.name}
        className="pg-glass-strong pg-scroll relative mx-auto max-h-[90dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] px-5 pt-2.5 pb-7"
        style={{ animation: 'pg-sheet-up 0.26s cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-ink/15" />

        <div className="mt-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="pg-title text-lg text-ink">{prompt.name}</h2>
            <p className="mt-0.5 text-[11px] font-bold text-ink-soft">
              {refs.length === 0
                ? 'No references'
                : `${refs.length} reference${refs.length === 1 ? '' : 's'}`}
              {' · '}
              {projectNames.length ? `For: ${projectNames.join(', ')}` : 'Global · all projects'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="pg-glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink transition active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {refs.length > 0 ? (
          <div className="mt-4">
            <span className="text-[11px] font-extrabold tracking-[0.12em] text-ink-soft uppercase">
              Reference media
            </span>
            <div className="mt-2">
              <RefThumbRow ids={refs} />
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          <span className="text-[11px] font-extrabold tracking-[0.12em] text-ink-soft uppercase">
            The prompt
          </span>
          <p className="pg-glass mt-2 rounded-[18px] p-3.5 text-sm leading-relaxed font-semibold whitespace-pre-wrap text-ink">
            {prompt.prompt}
          </p>
        </div>

        {prompt.notes?.trim() ? (
          <div className="mt-4">
            <span className="text-[11px] font-extrabold tracking-[0.12em] text-ink-soft uppercase">
              Notes
            </span>
            <p className="mt-2 text-xs leading-relaxed font-semibold text-ink-soft">
              {prompt.notes}
            </p>
          </div>
        ) : null}

        {confirming ? (
          <div className="mt-5 flex items-center gap-2 rounded-[16px] bg-rose-soft/60 p-2.5">
            <p className="text-xs font-bold text-rose-700">Delete this prompt?</p>
            <Button
              variant="ghost"
              className="ml-auto px-2 py-1 text-xs"
              onClick={() => setConfirming(false)}
            >
              Keep
            </Button>
            <Button
              variant="danger"
              className="px-2.5 py-1 text-xs"
              disabled={deletePending}
              onClick={onDelete}
            >
              {deletePending ? '…' : 'Delete'}
            </Button>
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-2">
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Delete
            </Button>
            {onSend ? (
              <Button variant="ghost" onClick={onSend}>
                Send ✉️
              </Button>
            ) : null}
            <Button className="ml-auto" onClick={onEdit}>
              Edit
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
