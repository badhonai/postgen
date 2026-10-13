import { weightedLength, X_WEIGHTED_LIMIT } from '../../lib/text'
import { cn } from '../../lib/cn'
import { Button, Textarea } from '../../components/ui'

export default function ThreadBuilder({
  tweets,
  onChange,
}: {
  tweets: string[]
  onChange: (next: string[]) => void
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
        return (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-zinc-500">
                {i + 1}/{tweets.length}
              </span>
              <div className="flex items-center gap-2">
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
          </div>
        )
      })}
      <Button variant="ghost" onClick={add}>
        + Add tweet
      </Button>
    </div>
  )
}
