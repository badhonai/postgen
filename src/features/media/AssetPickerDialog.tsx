import { useQueryClient } from '@tanstack/react-query'
import { useProjectAssets } from '../../lib/media'
import type { Asset } from '../../lib/types'
import AssetThumb from './AssetThumb'
import MediaUploader from './MediaUploader'
import { Button, Card, Spinner } from '../../components/ui'

export default function AssetPickerDialog({
  projectId,
  onSelect,
  onClose,
}: {
  projectId: string
  onSelect: (asset: Asset) => void
  onClose: () => void
}) {
  const qc = useQueryClient()
  const assets = useProjectAssets(projectId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <Card className="max-h-[85vh] w-full max-w-2xl overflow-y-auto">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Attach media</h2>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-4">
          <MediaUploader
            projectId={projectId}
            onUploaded={() => void qc.invalidateQueries({ queryKey: ['assets', projectId] })}
          />
        </div>

        <div className="mt-6">
          {assets.isPending ? (
            <Spinner />
          ) : (assets.data ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500">No media in this project yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(assets.data ?? []).map((asset) => (
                <AssetThumb
                  key={asset.id}
                  asset={asset}
                  selectable
                  onSelect={(a) => {
                    onSelect(a)
                    onClose()
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
