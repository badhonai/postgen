import { useQueryClient } from '@tanstack/react-query'
import { deleteAsset, useProjectAssets } from '../../lib/media'
import type { Asset } from '../../lib/types'
import AssetThumb from './AssetThumb'
import MediaUploader from './MediaUploader'
import { useProject, useSetAssetKind, useSetProjectLogo } from '../projects/api'
import { Card, ErrorBox, Spinner } from '../../components/ui'

export default function MediaLibrary({ projectId }: { projectId: string }) {
  const qc = useQueryClient()
  const assets = useProjectAssets(projectId)
  const project = useProject(projectId)
  const setLogo = useSetProjectLogo(projectId)
  const setKind = useSetAssetKind()

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['assets', projectId] })

  const handleDelete = (asset: Asset) => {
    if (!window.confirm(`Delete “${asset.filename}”? Posts using it will lose the attachment.`)) return
    void deleteAsset(asset.r2_key)
      .then(invalidate)
      .catch((err: unknown) =>
        window.alert(err instanceof Error ? err.message : 'delete failed'),
      )
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">Media & brand assets</h2>
      <p className="mt-2 text-xs text-zinc-500">
        Label each asset (logo, mascot, product…) so AI agents know what it is. One image is the
        project logo — shown on the dashboard and in post previews.
      </p>
      <div className="mt-4">
        <MediaUploader projectId={projectId} onUploaded={invalidate} />
      </div>

      <div className="mt-6">
        {assets.isPending ? (
          <Spinner />
        ) : assets.error ? (
          <ErrorBox
            message={assets.error instanceof Error ? assets.error.message : 'Failed to load media'}
          />
        ) : (assets.data ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">No media yet — drop a file above.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {(assets.data ?? []).map((asset) => (
              <AssetThumb
                key={asset.id}
                asset={asset}
                isLogo={project.data?.logo_asset_id === asset.id}
                onDelete={handleDelete}
                onSetLogo={(a) => setLogo.mutate(a.id)}
                onSetKind={(a, kind) => setKind.mutate({ assetId: a.id, kind })}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
