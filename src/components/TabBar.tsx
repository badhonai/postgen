import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/cn'

/**
 * Mobile bottom tab bar — frosted glass, with a raised deep-indigo "+"
 * in the center (matches bento mockup #1b-style bottom).
 */
export default function TabBar({
  active,
  onPlus,
}: {
  active: 'projects' | 'settings'
  onPlus: () => void
}) {
  const navigate = useNavigate()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 pb-[max(env(safe-area-inset-bottom),10px)]">
      <div className="mx-auto flex max-w-[440px] items-end justify-center px-8">
        <div className="pg-glass-strong pointer-events-auto flex w-full items-center justify-between rounded-full px-8 py-3">
          <TabButton
            label="Projects"
            active={active === 'projects'}
            onClick={() => navigate('/dashboard')}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7.5" height="7.5" rx="2.2" />
                <rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2" />
                <rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2" />
                <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2" />
              </svg>
            }
          />

          <button
            type="button"
            onClick={onPlus}
            aria-label="New project"
            className="pg-fab -mt-9 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white transition active:scale-95"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          <TabButton
            label="Settings"
            active={active === 'settings'}
            onClick={() => navigate('/settings')}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3.2" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.6a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.08A1.7 1.7 0 0 0 10.12 2.7V2.6a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56h.08a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.11z" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  )
}

function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-20 flex-col items-center gap-0.5 rounded-2xl py-1 transition active:scale-95',
        active ? 'text-ink' : 'text-ink-soft hover:text-ink',
      )}
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  )
}
