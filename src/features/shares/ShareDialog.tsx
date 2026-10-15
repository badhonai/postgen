import { useState } from 'react'
import { useSendShare } from './api'
import { SHARE_ITEM_LABEL, type ShareItemType } from '../../lib/types'
import { Button, ErrorBox, Input } from '../../components/ui'

export type ShareTarget = { itemType: ShareItemType; itemId: string; title: string }

/**
 * Send a project / post / prompt to another PostGen user by their account
 * email. They get it in their Shares inbox and choose to accept or decline —
 * nothing lands in their account until they accept.
 */
export default function ShareDialog({ target, onClose }: { target: ShareTarget; onClose: () => void }) {
  const send = useSendShare()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const submit = async () => {
    if (!email.trim()) return
    await send.mutateAsync({ ...target, recipientEmail: email, message })
    setSent(true)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-ink/35 backdrop-blur-[2px]" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Send ${SHARE_ITEM_LABEL[target.itemType].toLowerCase()}`}
        className="pg-glass-strong relative mx-auto w-full max-w-[440px] rounded-t-[28px] px-5 pt-2.5 pb-7"
        style={{ animation: 'pg-sheet-up 0.26s cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-ink/15" />
        {sent ? (
          <div className="pt-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint text-2xl">✉️</div>
            <h2 className="pg-title mt-3 text-xl text-ink">Sent!</h2>
            <p className="mx-auto mt-1.5 max-w-[300px] text-sm leading-relaxed font-semibold text-ink-soft">
              <strong className="text-ink">{target.title}</strong> is on its way to {email.trim()}. It will
              appear in their account only if they accept it from their Shares page.
            </p>
            <Button className="mt-5 w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <h2 className="pg-title mt-3 text-xl text-ink">
              Send {SHARE_ITEM_LABEL[target.itemType].toLowerCase()}
            </h2>
            <p className="mt-1 truncate text-sm font-semibold text-ink-soft">{target.title}</p>

            <label className="mt-4 block">
              <span className="text-[11px] font-extrabold tracking-[0.12em] text-ink-soft uppercase">
                Recipient's PostGen email
              </span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
                className="mt-1.5 w-full"
                autoFocus
              />
            </label>

            <label className="mt-3 block">
              <span className="text-[11px] font-extrabold tracking-[0.12em] text-ink-soft uppercase">
                Message (optional)
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="Thought you'd like this…"
                className="mt-1.5 w-full resize-none rounded-[18px] border border-white/70 bg-white/60 px-3.5 py-3 text-[15px] font-semibold text-ink placeholder:text-ink-soft/60 focus:outline-none"
              />
            </label>

            {send.error ? (
              <div className="mt-3">
                <ErrorBox message={send.error instanceof Error ? send.error.message : 'Could not send'} />
              </div>
            ) : null}

            <div className="mt-5 flex gap-2">
              <Button className="flex-1 py-3" disabled={send.isPending || !email.trim()} onClick={() => void submit()}>
                {send.isPending ? 'Sending…' : 'Send'}
              </Button>
              <Button variant="ghost" className="py-3" onClick={onClose} disabled={send.isPending}>
                Cancel
              </Button>
            </div>
            <p className="mt-3 text-center text-[11px] font-semibold text-ink-soft">
              They'll find it under Shares → Received and can accept or decline it.
            </p>
          </>
        )}
      </section>
    </div>
  )
}
