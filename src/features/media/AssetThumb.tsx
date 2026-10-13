import type { Asset } from '../../lib/types'
import { ASSET_KINDS } from '../../lib/types'
import { aspectLabel, formatBytes, useAssetUrl } from '../../lib/media'
import { cn } from '../../lib/cn'
import { Button, Select } from '../../components/ui'

export default function AssetThumb({
  asset,
  selected,
  selectable,
  isLogo,
  onSelect,
  onDelete,
  onSetLogo,
  onSetKind,
}: {
  asset: Asset
  selected?: boolean
  selectable?: boolean
  isLogo?: boolean
  onSelect?: (asset: Asset) => void
  onDelete?: (asset: Asset) => void
  onSetLogo?: (asset: Asset) => void
  onSetKind?: (asset: Asset, kind: string) => void
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
      {isLogo ? (
        <span className="absolute top-1.5 left-1.5 rounded-full bg-emerald-500/90 px-2 py-0.5 text-xs font-medium text-zinc-950">
          Logo
        </span>
      ) : null}
      <div className="space-y-0.5 p-2.5">
        <p className="truncate text-xs font-medium text-zinc-200" title={asset.filename}>
          {asset.filename}
        </p>
        <p className="text-xs text-zinc-500">
          {formatBytes(asset.size_bytes)}
          {aspect ? ` · ${aspect}` : ''}
        </p>
        {onSetKind ? (
          <Select
            className="mt-1 w-full text-xs"
            value={ASSET_KINDS.includes(asset.kind as (typeof ASSET_KINDS)[number]) ? asset.kind : 'other'}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onSetKind(asset, e.target.value)}
          >
            {ASSET_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
            {!ASSET_KINDS.includes(asset.kind as (typeof ASSET_KINDS)[number]) ? (
              <option value={asset.kind}>{asset.kind}</option>
            ) : null}
          </Select>
        ) : (
          <p className="text-xs text-zinc-500">{asset.kind}</p>
        )}
        {onSetLogo && isImage && !isLogo ? (
          <button
            type="button"
            className="mt-1 text-xs text-emerald-400 hover:underline"
            onClick={(e) => {
              e.stopPropagation()
              onSetLogo(asset)
            }}
          >
            Set as logo
          </button>
        ) : null}
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
