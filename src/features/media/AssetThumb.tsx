import type { Asset } from '../../lib/types'
import { aspectLabel, formatBytes, useAssetUrl } from '../../lib/media'
import { cn } from '../../lib/cn'
import { Button } from '../../components/ui'

export default function AssetThumb({
  asset,
  selected,
  selectable,
  onSelect,
  onDelete,
}: {
  asset: Asset
  selected?: boolean
  selectable?: boolean
  onSelect?: (asset: Asset) => void
  onDelete?: (asset: Asset) => void
}) {
  const url = useAssetUrl(asset.r2_key)
  const isImage = asset.mime_type.startsWith('image/')
  const aspect = aspectLabel(asset)

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-zinc-900/50',
        selected ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-zinc-800',
        selectable ? 'cursor-pointer hover:border-zinc-600' : '',
      )}
      onClick={selectable ? () => onSelect?.(asset) : undefined}
      onKeyDown={
        selectable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelect?.(asset)
            }
          : undefined
      }
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
    >
      <div className="flex h-28 items-center justify-center bg-zinc-950/60">
        {isImage && url.data ? (
          <img src={url.data} alt={asset.alt_text ?? asset.filename} className="h-full w-full object-cover" />
        ) : (
          <span className="text-3xl">{asset.mime_type.startsWith('video/') ? '🎬' : '📄'}</span>
        )}
      </div>
      <div className="space-y-0.5 p-2.5">
        <p className="truncate text-xs font-medium text-zinc-200" title={asset.filename}>
          {asset.filename}
        </p>
        <p className="text-xs text-zinc-500">
          {formatBytes(asset.size_bytes)}
          {aspect ? ` · ${aspect}` : ''}
        </p>
      </div>
      {onDelete ? (
        <Button
          variant="danger"
          className="absolute top-1.5 right-1.5 px-2 py-0.5 text-xs opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(asset)
          }}
        >
          ✕
        </Button>
      ) : null}
    </div>
  )
}
