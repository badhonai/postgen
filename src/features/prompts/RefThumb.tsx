import { memo } from 'react'
import { useAssetById } from './api'
import { useAssetUrl } from '../../lib/media'

/**
 * One reference image, resolved from the library-wide asset map. Used by
 * the bento card, the detail sheet and the composer, so all three agree
 * on how a reference looks.
 */
function RefThumb({
  assetId,
  className = 'h-12 w-12 rounded-[10px] object-cover',
}: {
  assetId: string
  className?: string
}) {
  const byId = useAssetById()
  const asset = byId.get(assetId)
  const urlQuery = useAssetUrl(asset?.r2_key)
  if (!asset) return null
  return (
    <img
      src={urlQuery.data ?? ''}
      alt={asset.alt_text || asset.filename}
      width={asset.width ?? undefined}
      height={asset.height ?? undefined}
      loading="lazy"
      decoding="async"
      className={className}
    />
  )
}

export default memo(RefThumb)
