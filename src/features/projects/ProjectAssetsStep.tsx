import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Asset } from '../../lib/types'
import { useProjectAssets } from '../../lib/media'
import { useSetProjectLogo, useSetAssetKind } from './api'
import MediaUploader from '../media/MediaUploader'
import AssetThumb from '../media/AssetThumb'
import { Button, Card, Spinner } from '../../components/ui'

/**
 * Step 2 of project creation: add the logo and any other brand assets
 * (mascot, product shots…). Runs right after the project row exists.
 */
export default function ProjectAssetsStep({
  projectId,
  onDone,
}: {
  projectId: string
  onDone: () => void
}) {
  const qc = useQueryClient()
  const assets = useProjectAssets(projectId)
  const setLogo = useSetProjectLogo(projectId)
  const setKind = useSetAssetKind()
  const [logoId, setLogoId] = useState<string | null>(null)

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['assets', projectId] })

  const handleUploaded = (asset: Asset) => {
    invalidate()
    if (!logoId && asset.mime_type.startsWith('image/')) {
      setLogoId(asset.id)
      setLogo.mutate(asset.id)
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Add your logo & assets</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Upload the project logo first — extra logos, mascot images, product shots can follow.
        The first image becomes the project logo automatically (change it anytime).
      </p>

      <div className="mt-5">
        <MediaUploader projectId={projectId} onUploaded={handleUploaded} />
      </div>

      <div className="mt-5">
        {assets.isPending ? (
          <Spinner />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(assets.data ?? []).map((asset) => (
              <AssetThumb
                key={asset.id}
                asset={asset}
                isLogo={logoId === asset.id}
                onSetLogo={(a) => {
                  setLogoId(a.id)
                  setLogo.mutate(a.id)
                }}
                onSetKind={(a, kind) => setKind.mutate({ assetId: a.id, kind })}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <Button onClick={onDone}>Done</Button>
      </div>
    </Card>
  )
}
