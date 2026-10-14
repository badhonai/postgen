import { Link } from 'react-router-dom'
import type { PostType, Project } from '../../lib/types'
import { POST_TYPE_LABEL, STATUS_DOT, STATUS_LABEL, TILE_COLORS } from '../../lib/types'
import { useAssetUrl } from '../../lib/media'

export type PostSummary = {
  id: string
  project_id: string
  title: string
  status: string
  post_type?: string
}

function Logo({ r2Key, size }: { r2Key?: string | null; size: number }) {
  const url = useAssetUrl(r2Key)
  if (!url.data) {
    return (
      <div
        className="flex items-center justify-center rounded-[20px] bg-white/60 font-display font-semibold text-ink-soft"
        style={{ width: size, height: size }}
      >
        ✦
      </div>
    )
  }
  return (
    <img
      src={url.data}
      alt=""
      className="rounded-[20px] object-cover ring-1 ring-white/70"
      style={{ width: size, height: size }}
    />
  )
}

/** Big mint hero tile — most recent project, with its posts as a mini checklist. */
export function HeroTile({
  project,
  posts,
  statusTab,
}: {
  project: Project
  posts: PostSummary[]
  statusTab: string
}) {
  const shown = posts.slice(0, 3)
  const more = posts.length - shown.length
  return (
    <Link to={`/projects/${project.id}?status=${statusTab}`} className="pg-tile relative block bg-mint p-5">
      <span className="absolute top-4 right-4 rounded-full bg-white/55 px-2.5 py-1 text-[10px] font-bold text-ink">
        {posts.length} post{posts.length === 1 ? '' : 's'}
      </span>
      <div className="flex items-center gap-3.5">
        <Logo r2Key={project.logo?.r2_key} size={58} />
        <div className="min-w-0 pr-14">
          <h3 className="pg-title truncate text-xl text-ink">{project.name}</h3>
          {project.x_username ? (
            <p className="truncate text-xs font-bold text-ink-soft">@{project.x_username}</p>
          ) : null}
        </div>
      </div>

      {project.description ? (
        <p className="mt-2.5 line-clamp-2 text-[13px] leading-snug font-semibold text-ink-soft">
          {project.description}
        </p>
      ) : null}

      {(project.content_pillars ?? []).length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {project.content_pillars.slice(0, 3).map((c) => (
            <span key={c} className="rounded-full bg-white/55 px-2.5 py-1 text-[11px] font-bold text-ink">
              {c}
            </span>
          ))}
        </div>
      ) : null}

      {shown.length > 0 ? (
        <div className="mt-3.5 space-y-1.5 rounded-[18px] bg-white/45 p-3">
          {shown.map((post) => (
            <div key={post.id} className="flex items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: STATUS_DOT[post.status] ?? '#a09cc4' }}
              />
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                {post.title || 'Untitled post'}
              </span>
              <span className="shrink-0 text-[10px] font-bold tracking-wide text-ink-soft uppercase">
                {post.post_type && post.post_type !== 'post' ? `${POST_TYPE_LABEL[post.post_type as PostType]} · ` : ''}
                {STATUS_LABEL[post.status] ?? post.status}
              </span>
            </div>
          ))}
          {more > 0 ? (
            <p className="pt-0.5 text-[11px] font-bold text-ink-soft">+{more} more post{more === 1 ? '' : 's'}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3.5 text-[13px] font-semibold text-ink-soft">No posts yet — tap to open.</p>
      )}
    </Link>
  )
}

/** Small colorful tile — secondary projects. */
export function SmallTile({
  project,
  color,
  postCount,
  statusTab,
}: {
  project: Project
  color: (typeof TILE_COLORS)[number]
  postCount: number
  statusTab: string
}) {
  return (
    <Link
      to={`/projects/${project.id}?status=${statusTab}`}
      className={`pg-tile flex min-h-[150px] flex-col justify-between ${color} p-4`}
    >
      <div className="flex items-start justify-between gap-2">
        <Logo r2Key={project.logo?.r2_key} size={42} />
        <span className="rounded-full bg-white/55 px-2.5 py-1 text-[10px] font-bold text-ink">
          {postCount === 0 ? 'empty' : `+${postCount} post${postCount === 1 ? '' : 's'}`}
        </span>
      </div>
      <div>
        <h3 className="pg-title line-clamp-2 text-[15px] leading-tight text-ink">{project.name}</h3>
        {project.x_username ? (
          <p className="mt-0.5 truncate text-[11px] font-bold text-ink-soft">@{project.x_username}</p>
        ) : null}
      </div>
    </Link>
  )
}

/**
 * Sits in the bento grid in place of a project tile and opens the prompt
 * library. Same tile language as the project cards so it reads as a peer,
 * not a bolt-on.
 */
export function PromptLibraryTile({ promptCount }: { promptCount: number }) {
  return (
    <Link to="/prompts" className="pg-tile flex min-h-[150px] flex-col justify-between bg-cream p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/60 text-ink">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </span>
        <span className="rounded-full bg-white/55 px-2.5 py-1 text-[10px] font-bold text-ink">
          {promptCount === 0 ? 'empty' : `${promptCount} prompt${promptCount === 1 ? '' : 's'}`}
        </span>
      </div>
      <div>
        <h3 className="pg-title text-[15px] leading-tight text-ink">Prompt library</h3>
        <p className="mt-0.5 text-[11px] font-bold text-ink-soft">Art recipes & references</p>
      </div>
    </Link>
  )
}
