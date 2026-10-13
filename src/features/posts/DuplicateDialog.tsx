import type { SimilarPost } from '../../lib/dedupe'
import { SIMILARITY_BLOCK } from '../../lib/dedupe'
import { Link } from 'react-router-dom'
import { Button, Card } from '../../components/ui'

function SimilarRow({ post }: { post: SimilarPost }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 px-3 py-2">
      <Link to={`/posts/${post.id}`} className="min-w-0 truncate text-sm text-zinc-200 hover:text-emerald-300">
        {post.title || 'Untitled post'}
      </Link>
      <span
        className={
          post.similarity >= SIMILARITY_BLOCK
            ? 'shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400'
            : 'shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400'
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <Card className="max-h-[80vh] w-full max-w-lg overflow-y-auto">
        <h2 className="text-lg font-semibold text-zinc-100">⚠️ Repeat post detected</h2>
        <p className="mt-2 text-sm text-zinc-400">
          {duplicateOf ? (
            <>
              This content already exists as{' '}
              <Link to={`/posts/${duplicateOf}`} className="text-emerald-400 hover:underline">
                an identical post
              </Link>
              .
            </>
          ) : (
            'This post is very similar to something you already stored:'
          )}
        </p>

        {similar.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {similar.map((s) => (
              <SimilarRow key={s.id} post={s} />
            ))}
          </ul>
        ) : null}

        <p className="mt-4 text-xs text-zinc-500">
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
      </Card>
    </div>
  )
}
