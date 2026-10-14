import { useAllAssetsByProject } from './api'
import { useAssetUrl } from '../../lib/media'

/**
 * One reference image, resolved from the library-wide asset list. Used by the
 * bento card, the detail sheet and the composer, so all three agree on how a
 * reference looks.
 */
export default function RefThumb({
  assetId,
  className = 'h-12 w-12 rounded-[10px] object-cover',
}: {
  assetId: string
  className?: string
}) {
  const groups = useAllAssetsByProject()
  const asset = (groups.data ?? [])
    .flatMap((g) => g.assets)
    .find((a) => a.id === assetId)
  const urlQuery = useAssetUrl(asset?.r2_key)
  if (!asset) return null
  return (
    <img
      src={urlQuery.data ?? ''}
      alt={asset.alt_text || asset.filename}
      loading="lazy"
      className={className}
    />
  )
}
