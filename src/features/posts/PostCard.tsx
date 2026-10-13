import { Link } from 'react-router-dom'
import type { PostListItem } from './api'
import { CATEGORY_LABELS, type PostStatus } from '../../lib/types'
import { Card } from '../../components/ui'

const STATUS_STYLES: Record<PostStatus, string> = {
  idea: 'bg-zinc-800 text-zinc-400',
  draft: 'bg-amber-500/10 text-amber-400',
  approved: 'bg-emerald-500/10 text-emerald-400',
  scheduled: 'bg-blue-500/10 text-blue-400',
  published: 'bg-emerald-500/20 text-emerald-300',
  archived: 'bg-zinc-800/60 text-zinc-500',
}

export default function PostCard({ post }: { post: PostListItem }) {
  const tweetCount = Math.max(1, post.content_text.split('\n').length)
  return (
    <Link to={`/posts/${post.id}`} className="group block">
      <Card className="h-full transition-colors group-hover:border-zinc-700">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-zinc-100 group-hover:text-emerald-300">
            {post.title || 'Untitled post'}
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[post.status]}`}>
              {post.status}
            </span>
          </div>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
          {post.content_text.replace(/<url>/g, '🔗').slice(0, 140) || 'Empty post'}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
          <span className="rounded-full bg-zinc-800/80 px-2 py-0.5">{CATEGORY_LABELS[post.category]}</span>
          {tweetCount > 1 ? (
            <span className="rounded-full bg-zinc-800/80 px-2 py-0.5">🧵 {tweetCount} tweets</span>
          ) : null}
          {post.created_via !== 'web' ? (
            <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-purple-400">
              via {post.created_via === 'mcp' ? 'MCP' : 'API'}
            </span>
          ) : null}
          <span className="ml-auto">{new Date(post.updated_at).toLocaleDateString()}</span>
        </div>
      </Card>
    </Link>
  )
}
