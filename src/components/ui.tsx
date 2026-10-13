import { useId } from 'react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from '../lib/cn'

const inputClass =
  'w-full rounded-2xl border border-white/70 bg-white/85 px-3.5 py-2.5 text-sm text-ink ' +
  'placeholder:text-ink-soft/70 shadow-[0_6px_18px_rgba(70,60,130,0.08)] ' +
  'focus:border-white focus:outline-none focus:ring-2 focus:ring-ink/15'

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'accent'
}) {
  const styles = {
    primary:
      'rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(47,43,94,0.32)] ' +
      'hover:brightness-110 active:scale-[0.97] transition disabled:opacity-50 disabled:pointer-events-none',
    accent:
      'rounded-full bg-butter px-5 py-2.5 text-sm font-bold text-ink shadow-[0_10px_24px_rgba(242,193,78,0.42)] ' +
      'hover:brightness-105 active:scale-[0.97] transition disabled:opacity-50 disabled:pointer-events-none',
    ghost:
      'rounded-full border border-white/75 bg-white/55 px-5 py-2.5 text-sm font-bold text-ink ' +
      'hover:bg-white/75 active:scale-[0.97] transition disabled:opacity-50 disabled:pointer-events-none',
    danger:
      'rounded-full border border-rose-300/70 bg-rose-soft/60 px-5 py-2.5 text-sm font-bold text-rose-700 ' +
      'hover:bg-rose-soft active:scale-[0.97] transition disabled:opacity-50 disabled:pointer-events-none',
  }
  return <button className={cn(styles[variant], className)} {...props} />
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('pg-glass rounded-[28px] p-6', className)}>{children}</div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs font-semibold text-ink-soft">{hint}</span> : null}
    </label>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, 'min-h-24', className)} {...props} />
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputClass, 'appearance-none', className)} {...props} />
}

export function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-white/60 border-t-ink" />
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-2xl bg-white/50', className)}
      aria-hidden="true"
    />
  )
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-rose-300/70 bg-rose-soft/50 px-4 py-3 text-sm font-semibold text-rose-700">
      {message}
    </div>
  )
}

export function ConfigNotice() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-bold">Supabase not configured</h1>
      <p className="text-zinc-400">
        Copy <code className="text-zinc-200">.env.example</code> to{' '}
        <code className="text-zinc-200">.env</code> and fill in your Supabase URL +
        publishable key (see README.md), then restart the dev server.
      </p>
    </main>
  )
}

/** PostGen's starburst mark on a glass circle. */
export function SparkleLogo({ size = 48, gradient = false }: { size?: number; gradient?: boolean }) {
  const gid = useId()
  const star =
    'M12 1.6c.7 3.9 1.9 6.4 3.6 8.1 1.7 1.7 4.2 2.9 8.1 3.6-3.9.7-6.4 1.9-8.1 3.6-1.7 1.7-2.9 4.2-3.6 8.1-.7-3.9-1.9-6.4-3.6-8.1-1.7-1.7-4.2-2.9-8.1-3.6 3.9-.7 6.4-1.9 8.1-3.6 1.7-1.7 2.9-4.2 3.6-8.1z'
  return (
    <div
      className={`flex items-center justify-center rounded-full ${
        gradient
          ? 'bg-white/65 shadow-[0_14px_36px_rgba(70,60,130,0.18)] ring-1 ring-white/80'
          : 'pg-glass text-ink'
      }`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * (gradient ? 0.52 : 0.58)}
        height={size * (gradient ? 0.52 : 0.58)}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {gradient ? (
          <>
            <defs>
              <linearGradient id={`pg-star-${gid}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6fc4f5" />
                <stop offset="55%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#f6c96b" />
              </linearGradient>
            </defs>
            <path fill={`url(#pg-star-${gid})`} d={star} />
            <path
              fill="#7cc7f2"
              transform="translate(2.2 2.2) scale(0.34)"
              d={star}
            />
            <path
              fill="#f6c96b"
              transform="translate(14.2 14.4) scale(0.3)"
              d={star}
            />
          </>
        ) : (
          <path fill="currentColor" d={star} />
        )}
      </svg>
    </div>
  )
}
