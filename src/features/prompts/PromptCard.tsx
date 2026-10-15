import type { ImagePrompt } from './api'
import { TILE_COLORS } from '../../lib/types'
import { useAllAssetsByProject } from './api'
import { useAssetUrl } from '../../lib/media'
import RefThumb from './RefThumb'
import { cn } from '../../lib/cn'

/**
 * A prompt as a bento card — same tile language as the project cards so it
 * reads as a peer. The cover image is the hero: full card width at its
 * actual aspect ratio, never cropped, so the whole example output is
 * visible at a glance. Name/count/palette sit below it; the full prompt
 * lives behind a tap.
 */
export default function PromptCard({
  prompt,
  index,
  projectNames = [],
  onOpen,
}: {
  prompt: ImagePrompt
  index: number
  projectNames?: string[]
  onOpen: () => void
}) {
  const refs = prompt.reference_asset_ids ?? []
  const groups = useAllAssetsByProject()
  const cover = refs.length
    ? (groups.data ?? []).flatMap((g) => g.assets).find((a) => a.id === refs[0])
    : undefined
  const coverUrl = useAssetUrl(cover?.r2_key)

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View ${prompt.name}`}
      className={cn(
        'pg-tile flex flex-col self-start p-3 text-left',
        TILE_COLORS[index % TILE_COLORS.length],
      )}
    >
      {cover && coverUrl.data ? (
        <span className="relative block overflow-hidden rounded-[16px] bg-white/45 ring-1 ring-white/70">
          {/* Actual image ratio, full cover visible — never cropped.
              width/height attrs reserve the right box before load;
              only freakishly tall images are height-capped. */}
          <img
            src={coverUrl.data}
            alt=""
            width={cover.width ?? undefined}
            height={cover.height ?? undefined}
            loading="lazy"
            className="block max-h-[300px] w-full object-contain"
          />
          <span className="absolute top-2 right-2 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold text-ink backdrop-blur-sm">
            {refs.length} cover{refs.length === 1 ? '' : 's'}
          </span>
        </span>
      ) : (
        <span className="flex items-start justify-between gap-2 px-1 pt-1">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/60 text-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </span>
          <span className="rounded-full bg-white/55 px-2.5 py-1 text-[10px] font-bold text-ink">no cover</span>
        </span>
      )}

      <span className="block px-1 pt-3 pb-1">
        <h3 className="pg-title line-clamp-2 text-[15px] leading-tight text-ink">{prompt.name}</h3>
        <p className="mt-0.5 truncate text-[11px] font-bold text-ink-soft">
          {prompt.notes?.trim() ? prompt.notes : 'Tap to view'}
        </p>
        <p className="mt-0.5 truncate text-[10px] font-bold text-ink-soft/80">
          {projectNames.length ? `For: ${projectNames.join(', ')}` : 'Global · all projects'}
          {prompt.use_reference_images ? ' · refs on' : ''}
        </p>
        {(prompt.color_codes ?? []).length > 0 ? (
          <span className="mt-1.5 flex items-center gap-1">
            {(prompt.color_codes ?? []).slice(0, 6).map((c) => (
              <span
                key={c}
                title={c}
                className="h-3 w-3 rounded-full ring-1 ring-white/80"
                style={{ background: c }}
              />
            ))}
            <span className="text-[9px] font-bold text-ink-soft">{(prompt.color_codes ?? []).length} colors</span>
          </span>
        ) : null}
      </span>
    </button>
  )
}

/** Cover thumbnails for the detail sheet — larger, actual ratio, uncropped. */
export function RefThumbRow({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null
  return (
    <div className="flex flex-wrap items-start gap-2">
      {ids.map((id) => (
        <RefThumb key={id} assetId={id} className="h-32 w-auto max-w-full rounded-[14px] ring-1 ring-white/70" />
      ))}
    </div>
  )
}
