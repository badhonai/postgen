import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/context'
import { useProjects } from '../features/projects/api'
import { usePosts } from '../features/posts/api'
import { cn } from '../lib/cn'

type PaletteItem = {
  id: string
  label: string
  hint?: string
  run: () => void
}

/**
 * ⌘K / Ctrl+K quick switcher — jump to projects, posts, or pages.
 */
export default function CommandPalette() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const projects = useProjects()
  const posts = usePosts()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
        setQuery('')
        setSelected(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const items = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [
      { id: 'nav-dashboard', label: 'Dashboard', hint: 'Page', run: () => navigate('/dashboard') },
      { id: 'nav-settings', label: 'Settings', hint: 'Page', run: () => navigate('/settings') },
      ...(projects.data ?? []).map((p) => ({
        id: `project-${p.id}`,
        label: p.name,
        hint: 'Project',
        run: () => navigate(`/projects/${p.id}`),
      })),
      ...(posts.data ?? []).map((p) => ({
        id: `post-${p.id}`,
        label: p.title || p.content_text.slice(0, 60) || 'Untitled post',
        hint: `Post · ${p.status}`,
        run: () => navigate(`/posts/${p.id}`),
      })),
    ]
    const q = query.trim().toLowerCase()
    return q ? list.filter((i) => i.label.toLowerCase().includes(q)) : list
  }, [projects.data, posts.data, query, navigate])

  if (!session || !open) return null

  const chosen = Math.min(selected, Math.max(0, items.length - 1))

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 p-4 pt-[15vh]"
      onClick={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false)
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelected((s) => Math.min(s + 1, items.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelected((s) => Math.max(s - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            const item = items[chosen]
            if (item) {
              item.run()
              setOpen(false)
            }
          }
        }}
        role="dialog"
        aria-label="Quick switcher"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(0)
          }}
          placeholder="Jump to project, post, or page…"
          className="w-full border-b border-zinc-800 bg-transparent px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
        />
        <ul className="max-h-80 overflow-y-auto py-1">
          {items.length === 0 ? (
            <li className="px-4 py-3 text-sm text-zinc-500">No matches.</li>
          ) : (
            items.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm',
                    i === chosen ? 'bg-emerald-500/15 text-emerald-300' : 'text-zinc-300 hover:bg-zinc-800/60',
                  )}
                  onClick={() => {
                    item.run()
                    setOpen(false)
                  }}
                  onMouseEnter={() => setSelected(i)}
                >
                  <span className="truncate">{item.label}</span>
                  {item.hint ? <span className="shrink-0 text-xs text-zinc-500">{item.hint}</span> : null}
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-zinc-800 px-4 py-2 text-xs text-zinc-500">
          <kbd className="rounded bg-zinc-800 px-1">↑↓</kbd> navigate ·{' '}
          <kbd className="rounded bg-zinc-800 px-1">↵</kbd> open ·{' '}
          <kbd className="rounded bg-zinc-800 px-1">esc</kbd> close
        </div>
      </div>
    </div>
  )
}
