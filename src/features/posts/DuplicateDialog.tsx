import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { SimilarPost } from '../../lib/dedupe'
import { Button } from '../../components/ui'

function SimilarRow({ post }: { post: SimilarPost }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-[16px] bg-white/50 px-3.5 py-2.5">
      <Link to={`/posts/${post.id}`} className="min-w-0 truncate text-sm font-bold text-ink hover:underline">
        {post.title || 'Untitled post'}
      </Link>
      <span
        className={
          post.similarity >= 0.65
            ? 'shrink-0 rounded-full bg-rose-soft/70 px-2 py-0.5 text-xs font-bold text-rose-700'
            : 'shrink-0 rounded-full bg-white/65 px-2 py-0.5 text-xs font-bold text-ink-soft'
        }
      >
        {Math.round(post.similarity * 100)}% similar
      </span>
    </li>
  )
}

export default function DuplicateDialog({
  duplicateOf,
  similar,
  busy,
  onSaveAnyway,
  onCancel,
}: {
  duplicateOf: string | null
  similar: SimilarPost[]
  busy: boolean
  onSaveAnyway: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 p-4 backdrop-blur-sm">
      <div className="pg-glass-strong max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-[28px] p-6">
        <h2 className="pg-title text-xl text-ink">⚠️ Repeat post detected</h2>
        <p className="mt-2 text-sm font-semibold text-ink-soft">
          {duplicateOf ? (
            <>
              This matches an{' '}
              <Link to={`/posts/${duplicateOf}`} className="text-ink font-bold underline underline-offset-2">
                existing post
              </Link>{' '}
              exactly.
            </>
          ) : (
            'These posts are very similar to what you wrote.'
          )}
        </p>

        {similar.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {similar.map((post) => (
              <SimilarRow key={post.id} post={post} />
            ))}
          </ul>
        ) : null}

        <p className="mt-4 text-xs font-semibold text-ink-soft">
          PostGen blocks repeats — only save if this is an intentional variant.
        </p>

        <div className="mt-6 flex gap-3">
          <Button onClick={onSaveAnyway} disabled={busy}>
            {busy ? 'Saving…' : 'Save anyway (intentional variant)'}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
