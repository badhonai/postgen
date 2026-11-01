import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/cn'
import { usePendingShareCount } from '../features/shares/api'

export type TabBarActive = 'projects' | 'plan' | 'inbox' | 'settings'

/**
 * Mobile bottom tab bar — frosted glass dock with Projects, Plan & History,
 * central "+", Shares Inbox (with pending badge), and Settings.
 */
export default function TabBar({
  active,
  onPlus,
}: {
  active: TabBarActive
  onPlus?: () => void
}) {
  const navigate = useNavigate()
  const pendingShares = usePendingShareCount()
  const pendingCount = pendingShares.data ?? 0

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 pb-[max(env(safe-area-inset-bottom),10px)]">
      <div className="mx-auto flex max-w-[440px] items-end justify-center px-4">
        <div className="pg-glass-strong pointer-events-auto flex w-full items-center justify-between rounded-full px-3 py-2 shadow-[0_12px_32px_rgba(70,60,130,0.18)]">
          <TabButton
            label="Projects"
            active={active === 'projects'}
            onClick={() => navigate('/dashboard')}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7.5" height="7.5" rx="2.2" />
                <rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2" />
                <rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2" />
                <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2" />
              </svg>
            }
          />

          <TabButton
            label="Plan"
            active={active === 'plan'}
            onClick={() => navigate('/planner')}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2.5" ry="2.5" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
              </svg>
            }
          />

          <button
            type="button"
            onClick={onPlus ?? (() => navigate('/dashboard'))}
            aria-label="New project"
            className="pg-fab -mt-7 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-white shadow-lg transition active:scale-95"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          <TabButton
            label="Inbox"
            active={active === 'inbox'}
            onClick={() => navigate('/shares')}
            badge={pendingCount > 0 ? pendingCount : undefined}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="m3.5 7 8.5 6 8.5-6" />
              </svg>
            }
          />

          <TabButton
            label="Settings"
            active={active === 'settings'}
            onClick={() => navigate('/settings')}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
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
  badge,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  badge?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex w-15 flex-col items-center gap-0.5 rounded-2xl py-1 transition active:scale-95',
        active ? 'text-ink font-extrabold' : 'text-ink-soft hover:text-ink',
      )}
    >
      <div className="relative flex items-center justify-center">
        {icon}
        {badge ? (
          <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white ring-2 ring-white/80">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </div>
      <span className="text-[10px] font-bold tracking-tight">{label}</span>
    </button>
  )
}
