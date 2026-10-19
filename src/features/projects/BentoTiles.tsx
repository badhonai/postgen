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

/** Two small pills: amber drafts · green approved. */
export function StatusPills({ drafts, approved }: { drafts: number; approved: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="flex items-center gap-1.5 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-extrabold text-ink">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_DOT.draft }} />
        {drafts} draft{drafts === 1 ? '' : 's'}
      </span>
      <span className="flex items-center gap-1.5 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-extrabold text-ink">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_DOT.approved }} />
        {approved} approved
      </span>
    </div>
  )
}

function Logo({ r2Key, size }: { r2Key?: string | null; size: number }) {
  const url = useAssetUrl(r2Key)
  if (!url.data) {
    return (
      <div
        className="flex items-center justify-center rounded-[14px] bg-white/60 font-display font-semibold text-ink-soft"
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
      loading="lazy"
      decoding="async"
      className="rounded-[14px] object-cover ring-1 ring-white/70"
      style={{ width: size, height: size }}
    />
  )
}

/** Big mint hero tile — most recent project, with its posts as a mini checklist. */
export function HeroTile({
  project,
  posts,
  draftCount,
  approvedCount,
  statusTab,
}: {
  project: Project
  posts: PostSummary[]
  draftCount: number
  approvedCount: number
  statusTab: string
}) {
  const latest = posts[0]
  return (
    <Link to={`/projects/${project.id}?status=${statusTab}`} className="pg-tile pg-cv relative block bg-mint p-4">
      <div className="flex items-center gap-3">
        <Logo r2Key={project.logo?.r2_key} size={46} />
        <div className="min-w-0 flex-1">
          <h3 className="pg-title truncate text-lg text-ink">{project.name}</h3>
          {project.x_username ? (
            <p className="truncate text-xs font-bold text-ink-soft">@{project.x_username}</p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-white/55 px-2.5 py-1 text-[10px] font-bold text-ink">
          {posts.length} post{posts.length === 1 ? '' : 's'}
        </span>
      </div>

      {latest ? (
        <div className="mt-3 flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: STATUS_DOT[latest.status] ?? '#a09cc4' }}
          />
          <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink">
            {latest.title || 'Untitled post'}
          </span>
          <span className="shrink-0 text-[9px] font-bold tracking-wide text-ink-soft uppercase">
            {latest.post_type && latest.post_type !== 'post' ? `${POST_TYPE_LABEL[latest.post_type as PostType]} · ` : ''}
            {STATUS_LABEL[latest.status] ?? latest.status}
          </span>
        </div>
      ) : (
        <p className="mt-3 text-[12px] font-semibold text-ink-soft">No posts yet — tap to open.</p>
      )}

      <div className="mt-3">
        <StatusPills drafts={draftCount} approved={approvedCount} />
      </div>
    </Link>
  )
}

/** Small colorful tile — secondary projects. */
export function SmallTile({
  project,
  color,
  postCount,
  draftCount,
  approvedCount,
  statusTab,
}: {
  project: Project
  color: (typeof TILE_COLORS)[number]
  postCount: number
  draftCount: number
  approvedCount: number
  statusTab: string
}) {
  return (
    <Link
      to={`/projects/${project.id}?status=${statusTab}`}
      className={`pg-tile pg-cv flex min-h-[122px] flex-col justify-between ${color} p-3`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <Logo r2Key={project.logo?.r2_key} size={36} />
          <span className="rounded-full bg-white/55 px-2.5 py-1 text-[10px] font-bold text-ink">
            {postCount === 0 ? 'empty' : `+${postCount} post${postCount === 1 ? '' : 's'}`}
          </span>
        </div>
        <h3 className="pg-title mt-2 line-clamp-1 text-sm leading-tight text-ink">{project.name}</h3>
        {project.x_username ? (
          <p className="mt-0.5 truncate text-[11px] font-bold text-ink-soft">@{project.x_username}</p>
        ) : null}
      </div>
      <div className="mt-auto pt-2.5">
        <StatusPills drafts={draftCount} approved={approvedCount} />
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
    <Link to="/prompts" className="pg-tile pg-cv flex min-h-[122px] flex-col justify-between bg-cream p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/60 text-ink">
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

/**
 * Artworks hub tile — media-first gallery items with optional captions.
 * Artworks are not posts to publish, so they get their own home rather
 * than living inside the post lists.
 */
export function ArtworksTile({ artworkCount }: { artworkCount: number }) {
  return (
    <Link to="/artworks" className="pg-tile pg-cv flex min-h-[122px] flex-col justify-between bg-lilac p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/60 text-ink">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <circle cx="8.5" cy="9.5" r="1.8" />
            <path d="M21 16l-5.5-5L7 20" />
          </svg>
        </span>
        <span className="rounded-full bg-white/55 px-2.5 py-1 text-[10px] font-bold text-ink">
          {artworkCount === 0 ? 'empty' : `${artworkCount} artwork${artworkCount === 1 ? '' : 's'}`}
        </span>
      </div>
      <div>
        <h3 className="pg-title text-[15px] leading-tight text-ink">Artworks</h3>
        <p className="mt-0.5 text-[11px] font-bold text-ink-soft">Images & optional captions</p>
      </div>
    </Link>
  )
}
