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

/** One neat status line: amber drafts · green approved on a single pill. */
export function StatusPills({ drafts, approved }: { drafts: number; approved: number }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/65 px-2.5 py-1 text-[10px] font-extrabold whitespace-nowrap text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS_DOT.draft }} />
      {drafts} draft{drafts === 1 ? '' : 's'}
      <span className="text-ink-soft">·</span>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS_DOT.approved }} />
      {approved} approved
    </span>
  )
}

/** Small circular arrow that makes a tile read as tappable. */
function TileArrow() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/60 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </span>
  )
}

/** Soft off-canvas sheen that keeps flat pastel tiles from looking plain. */
function Sheen() {
  return <span aria-hidden="true" className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-white/25" />
}

function Logo({ r2Key, size }: { r2Key?: string | null; size: number }) {
  const url = useAssetUrl(r2Key)
  if (!url.data) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-[15px] bg-white/65 font-display font-semibold text-ink-soft shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
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
      className="shrink-0 rounded-[15px] bg-white/65 object-cover ring-1 ring-white/70"
      style={{ width: size, height: size }}
    />
  )
}

/** Featured tile — most recent project. Compact, with a grouped white panel. */
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
    <Link to={`/projects/${project.id}?status=${statusTab}`} className="pg-tile pg-cv relative block overflow-hidden bg-mint p-4">
      <Sheen />
      <div className="relative flex items-center gap-3">
        <Logo r2Key={project.logo?.r2_key} size={52} />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">Most recent</p>
          <h3 className="pg-title mt-0.5 truncate text-[19px] leading-tight text-ink">{project.name}</h3>
          {project.x_username ? (
            <p className="truncate text-xs font-bold text-ink-soft">@{project.x_username}</p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-white/60 px-2.5 py-1 text-[10px] font-bold text-ink">
          {posts.length} post{posts.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="relative mt-3.5 rounded-[18px] bg-white/50 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] ring-1 ring-white/50">
        {latest ? (
          <div className="flex items-center gap-2">
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
          <p className="text-[12px] font-semibold text-ink-soft">No posts yet — tap to open.</p>
        )}
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/70 pt-2.5">
          <StatusPills drafts={draftCount} approved={approvedCount} />
          <span className="flex shrink-0 items-center gap-1.5">
            {posts.length > 1 ? (
              <span className="text-[10px] font-bold text-ink-soft">+{posts.length - 1} more</span>
            ) : null}
            <TileArrow />
          </span>
        </div>
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
      className={`pg-tile pg-cv relative flex min-h-[136px] flex-col overflow-hidden ${color} p-4`}
    >
      <Sheen />
      <div className="relative flex items-start justify-between gap-2">
        <Logo r2Key={project.logo?.r2_key} size={40} />
        <span className="rounded-full bg-white/60 px-2.5 py-1 text-[10px] font-bold text-ink">
          {postCount === 0 ? 'empty' : `${postCount} post${postCount === 1 ? '' : 's'}`}
        </span>
      </div>
      <h3 className="pg-title relative mt-3 line-clamp-1 text-[15px] leading-tight text-ink">{project.name}</h3>
      {project.x_username ? (
        <p className="relative mt-0.5 truncate text-[11px] font-bold text-ink-soft">@{project.x_username}</p>
      ) : null}
      <div className="relative mt-auto flex items-center justify-between gap-2 pt-3">
        <StatusPills drafts={draftCount} approved={approvedCount} />
        <TileArrow />
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
    <Link to="/prompts" className="pg-tile pg-cv relative flex min-h-[136px] flex-col overflow-hidden bg-cream p-4">
      <Sheen />
      <div className="relative flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-white/65 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </span>
        <span className="rounded-full bg-white/60 px-2.5 py-1 text-[10px] font-bold text-ink">
          {promptCount === 0 ? 'empty' : `${promptCount} prompt${promptCount === 1 ? '' : 's'}`}
        </span>
      </div>
      <h3 className="pg-title relative mt-3 text-[15px] leading-tight text-ink">Prompt library</h3>
      <p className="relative mt-0.5 text-[11px] font-bold text-ink-soft">Art recipes & references</p>
      <div className="relative mt-auto flex justify-end pt-3">
        <TileArrow />
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
    <Link to="/artworks" className="pg-tile pg-cv relative flex min-h-[136px] flex-col overflow-hidden bg-lilac p-4">
      <Sheen />
      <div className="relative flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-white/65 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <circle cx="8.5" cy="9.5" r="1.8" />
            <path d="M21 16l-5.5-5L7 20" />
          </svg>
        </span>
        <span className="rounded-full bg-white/60 px-2.5 py-1 text-[10px] font-bold text-ink">
          {artworkCount === 0 ? 'empty' : `${artworkCount} artwork${artworkCount === 1 ? '' : 's'}`}
        </span>
      </div>
      <h3 className="pg-title relative mt-3 text-[15px] leading-tight text-ink">Artworks</h3>
      <p className="relative mt-0.5 text-[11px] font-bold text-ink-soft">Images & optional captions</p>
      <div className="relative mt-auto flex justify-end pt-3">
        <TileArrow />
      </div>
    </Link>
  )
}
