import { weightedLength, X_WEIGHTED_LIMIT } from '../../lib/text'
import { cn } from '../../lib/cn'
import type { Asset } from '../../lib/types'
import { useAssetUrl } from '../../lib/media'
import { Button, Textarea } from '../../components/ui'

function AttachmentChip({
  asset,
  onRemove,
}: {
  asset: Asset
  onRemove: () => void
}) {
  const url = useAssetUrl(asset.r2_key)
  const isImage = asset.mime_type.startsWith('image/')
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/80 py-0.5 pr-1 pl-1.5 text-xs text-zinc-300">
      {isImage && url.data ? (
        <img src={url.data} alt="" className="h-5 w-5 rounded-full object-cover" />
      ) : (
        <span>{isImage ? '🖼' : '🎬'}</span>
      )}
      <span className="max-w-32 truncate">{asset.filename}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full px-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200"
        aria-label={`Remove ${asset.filename}`}
      >
        ✕
      </button>
    </span>
  )
}

export default function ThreadBuilder({
  tweets,
  attachments,
  onChange,
  onAttach,
  onRemoveAttachment,
}: {
  tweets: string[]
  attachments: Array<{ tweetIndex: number; asset: Asset }>
  onChange: (next: string[]) => void
  onAttach: (tweetIndex: number) => void
  onRemoveAttachment: (assetId: string) => void
}) {
  const setAt = (i: number, value: string) => {
    const next = [...tweets]
    next[i] = value
    onChange(next)
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= tweets.length) return
    const next = [...tweets]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  const remove = (i: number) => {
    if (tweets.length <= 1) return
    onChange(tweets.filter((_, idx) => idx !== i))
  }

  const add = () => onChange([...tweets, ''])

  return (
    <div className="space-y-4">
      {tweets.map((tweet, i) => {
        const used = weightedLength(tweet)
        const over = used > X_WEIGHTED_LIMIT
        const tweetAttachments = attachments.filter((a) => a.tweetIndex === i)
        return (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-zinc-500">
                {i + 1}/{tweets.length}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => onAttach(i)}>
                  📎 attach
                </Button>
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    over ? 'font-semibold text-red-400' : used > 260 ? 'text-amber-400' : 'text-zinc-500',
                  )}
                  title="X weighted length (links count as 23, CJK/emoji as 2)"
                >
                  {used}/{X_WEIGHTED_LIMIT}
                </span>
                <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => move(i, -1)} disabled={i === 0}>
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  className="px-2 py-1 text-xs"
                  onClick={() => move(i, 1)}
                  disabled={i === tweets.length - 1}
                >
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  className="px-2 py-1 text-xs"
                  onClick={() => remove(i)}
                  disabled={tweets.length <= 1}
                >
                  ✕
                </Button>
              </div>
            </div>
            <Textarea
              value={tweet}
              onChange={(e) => setAt(i, e.target.value)}
              placeholder={i === 0 ? 'Write your hook…' : 'Next tweet in the thread…'}
              className="min-h-20"
            />
            {tweetAttachments.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tweetAttachments.map((a) => (
                  <AttachmentChip
                    key={a.asset.id}
                    asset={a.asset}
                    onRemove={() => onRemoveAttachment(a.asset.id)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
      <Button variant="ghost" onClick={add}>
        + Add tweet
      </Button>
    </div>
  )
}
