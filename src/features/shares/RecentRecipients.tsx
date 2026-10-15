import { useState } from 'react'
import { forgetRecipient, getRecentRecipients } from '../../lib/recipients'
import { cn } from '../../lib/cn'

/**
 * Quick-select chips for emails used in past sends. Tap one to fill the
 * recipient field; tap its ✕ to forget it. Parents remount via `key`
 * re-read the list right after a send (when a new email gets saved).
 */
export default function RecentRecipients({
  value,
  onPick,
}: {
  value?: string
  onPick: (email: string) => void
}) {
  const [list, setList] = useState<string[]>(getRecentRecipients)

  if (list.length === 0) return null

  return (
    <div className="mt-2">
      <p className="text-[10px] font-extrabold tracking-[0.12em] text-ink-soft uppercase">Recent — tap to reuse</p>
      <div className="pg-scroll mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
        {list.map((email) => {
          const active = value?.trim().toLowerCase() === email.toLowerCase()
          return (
            <span
              key={email}
              className={cn(
                'flex shrink-0 items-center gap-1 rounded-full py-1.5 pr-1.5 pl-3 text-xs font-bold transition',
                active ? 'bg-ink text-white' : 'bg-white/55 text-ink hover:bg-white/80',
              )}
            >
              <button type="button" onClick={() => onPick(email)} className="max-w-52 truncate">
                ✉️ {email}
              </button>
              <button
                type="button"
                aria-label={`Forget ${email}`}
                title="Forget this email"
                onClick={() => setList(forgetRecipient(email))}
                className={cn(
                  'flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px]',
                  active ? 'bg-white/20 text-white' : 'bg-ink/8 text-ink-soft hover:text-ink',
                )}
              >
                ✕
              </button>
            </span>
          )
        })}
      </div>
    </div>
  )
}
