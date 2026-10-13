import { useEffect, useState, type FormEvent } from 'react'
import type { Asset, PostCategory, PostStatus } from '../../lib/types'
import { CATEGORY_LABELS } from '../../lib/types'
import { Button, ErrorBox, Field, Input, Select } from '../../components/ui'
import ThreadBuilder from './ThreadBuilder'
import AssetPickerDialog from '../media/AssetPickerDialog'
import type { SavePostInput } from './api'

const STATUSES: PostStatus[] = ['idea', 'draft', 'approved', 'scheduled', 'published', 'archived']

function csvToList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim().replace(/^#/, '').toLowerCase())
    .filter(Boolean)
}

export default function PostForm({
  initial,
  busy,
  error,
  onSubmit,
  onCancel,
  onChange,
}: {
  initial?: SavePostInput
  busy: boolean
  error?: string | null
  onSubmit: (input: SavePostInput) => void
  onCancel: () => void
  /** Fires on every edit with the current snapshot (used for autosave + ⌘S). */
  onChange?: (snapshot: SavePostInput) => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState<PostCategory>(initial?.category ?? 'promotional')
  const [status, setStatus] = useState<PostStatus>(initial?.status ?? 'draft')
  const [tagNames, setTagNames] = useState((initial?.tagNames ?? []).join(', '))
  const [tweets, setTweets] = useState<string[]>(
    initial?.tweets.length ? initial.tweets : [''],
  )
  const [attachments, setAttachments] = useState<Array<{ tweetIndex: number; asset: Asset }>>(
    initial?.media ?? [],
  )
  const [attachFor, setAttachFor] = useState<number | null>(null)

  const snapshot = (): SavePostInput => ({
    postId: initial?.postId,
    projectId: initial!.projectId,
    category,
    status,
    title: title.trim(),
    tweets,
    tagNames: csvToList(tagNames),
    contentText: '', // filled by caller (normalize + hash)
    contentHash: '',
    media: attachments,
    createdVia: initial?.createdVia,
  })

  useEffect(() => {
    onChange?.(snapshot())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot mirrors form state
  }, [title, category, status, tagNames, tweets, attachments])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(snapshot())
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error ? <ErrorBox message={error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" hint="Internal label — not posted to X.">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Launch announcement thread"
          />
        </Field>
        <Field label="Tags" hint="Comma-separated.">
          <Input
            value={tagNames}
            onChange={(e) => setTagNames(e.target.value)}
            placeholder="launch, defi, thread"
          />
        </Field>
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value as PostCategory)}>
            {(Object.keys(CATEGORY_LABELS) as PostCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as PostStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-zinc-300 uppercase">
          Thread
        </h3>
        <ThreadBuilder
          tweets={tweets}
          attachments={attachments}
          onChange={setTweets}
          onAttach={(i) => setAttachFor(i)}
          onRemoveAttachment={(assetId) =>
            setAttachments((prev) => prev.filter((a) => a.asset.id !== assetId))
          }
        />
      </div>

      {attachFor !== null ? (
        <AssetPickerDialog
          projectId={initial!.projectId}
          onSelect={(asset) =>
            setAttachments((prev) => [...prev.filter((a) => a.asset.id !== asset.id), { tweetIndex: attachFor, asset }])
          }
          onClose={() => setAttachFor(null)}
        />
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : initial?.postId ? 'Save changes' : 'Create post'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
