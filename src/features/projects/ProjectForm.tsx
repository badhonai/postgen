import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { BrandVoice, OfficialLink, Project } from '../../lib/types'
import { Button, ErrorBox, Field, Input, Textarea } from '../../components/ui'
import BrandVoiceEditor from './BrandVoiceEditor'
import type { ProjectInput } from './api'
import { EMPTY_PROJECT_INPUT, projectInputOf } from './api'

type QueuedFile = { file: File; url: string }

function csvToList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function listToCsv(list: string[] | undefined): string {
  return (list ?? []).join(', ')
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="mb-4 text-xs font-extrabold tracking-[0.14em] text-ink uppercase">{children}</h3>
  )
}

function LogoAssetsField({
  queued,
  logoIndex,
  onAdd,
  onRemove,
  onLogoIndex,
}: {
  queued: QueuedFile[]
  logoIndex: number | null
  onAdd: (files: QueuedFile[]) => void
  onRemove: (index: number) => void
  onLogoIndex: (index: number | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const effectiveLogo =
    logoIndex ?? queued.findIndex((q) => q.file.type.startsWith('image/'))

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) {
            onAdd(files.map((file) => ({ file, url: URL.createObjectURL(file) })))
          }
          if (inputRef.current) inputRef.current.value = ''
        }}
      />
      <Button type="button" variant="ghost" onClick={() => inputRef.current?.click()}>
        + Add logo & assets
      </Button>
      <p className="text-xs font-semibold text-ink-soft">
        Logo first, then extra logos, mascot images, product shots… Click a thumbnail to choose
        which one becomes the project logo (default: first image).
      </p>

      {queued.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {queued.map((q, i) => (
            <div
              key={q.url}
              className={`group relative overflow-hidden rounded-xl border bg-white/70 ${
                effectiveLogo === i
                  ? 'border-butter-deep ring-2 ring-butter-deep'
                  : 'border-white/80'
              }`}
            >
              <button
                type="button"
                className="block h-24 w-full"
                onClick={() => onLogoIndex(effectiveLogo === i ? null : i)}
                title="Set as project logo"
              >
                {q.file.type.startsWith('image/') ? (
                  <img src={q.url} alt={q.file.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl">🎬</span>
                )}
              </button>
              {effectiveLogo === i ? (
                <span className="absolute top-1.5 left-1.5 rounded-full bg-butter px-2 py-0.5 text-xs font-bold text-ink">
                  Logo
                </span>
              ) : null}
              <button
                type="button"
                className="absolute top-1.5 right-1.5 rounded-md bg-ink/75 px-1.5 py-0.5 text-xs text-white"
                onClick={() => onRemove(i)}
              >
                ✕
              </button>
              <p className="truncate px-2 py-1 text-xs font-semibold text-ink-soft" title={q.file.name}>
                {q.file.name}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function ProjectForm({
  initial,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: Project
  busy: boolean
  error?: string | null
  onSubmit: (input: ProjectInput) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<ProjectInput>(initial ? projectInputOf(initial) : EMPTY_PROJECT_INPUT)
  const set = (patch: Partial<ProjectInput>) => setDraft((d) => ({ ...d, ...patch }))
  const setVoice = (brandVoice: BrandVoice) => set({ brandVoice })

  const [links, setLinks] = useState<OfficialLink[]>(draft.officialLinks)
  const [queued, setQueued] = useState<QueuedFile[]>([])
  const [logoIndex, setLogoIndex] = useState<number | null>(null)

  // release object URLs on unmount
  useEffect(() => {
    return () => queued.forEach((q) => URL.revokeObjectURL(q.url))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addQueued = (files: QueuedFile[]) => setQueued((q) => [...q, ...files])
  const removeQueued = (index: number) => {
    setQueued((q) => {
      URL.revokeObjectURL(q[index].url)
      return q.filter((_, i) => i !== index)
    })
    setLogoIndex((li) => (li === null ? null : li === index ? null : li > index ? li - 1 : li))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.name.trim()) return
    onSubmit({
      ...draft,
      officialLinks: links,
      newAssets: queued.map((q) => q.file),
      newLogoIndex: logoIndex,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      {error ? <ErrorBox message={error} /> : null}

      <div className="space-y-4">
        <SectionTitle>Logo & assets</SectionTitle>
        <LogoAssetsField
          queued={queued}
          logoIndex={logoIndex}
          onAdd={addQueued}
          onRemove={removeQueued}
          onLogoIndex={setLogoIndex}
        />
        {initial ? (
          <p className="text-xs font-semibold text-ink-soft">
            Already-uploaded assets (and “Set as logo”) are in the Media & brand assets gallery
            below — new picks upload when you save.
          </p>
        ) : null}
      </div>

      <div className="border-t border-white/70 pt-6">
        <SectionTitle>Identity</SectionTitle>
        <Field
          label="Project name"
          hint={initial ? `Slug: ${initial.slug}` : 'A URL slug is generated automatically.'}
        >
          <Input
            required
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. My DeFi Protocol"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="X username" hint="Without the @.">
            <Input
              value={draft.xUsername}
              onChange={(e) => set({ xUsername: e.target.value })}
              placeholder="myprotocol"
            />
          </Field>
          <Field label="Website">
            <Input
              type="url"
              value={draft.websiteUrl}
              onChange={(e) => set({ websiteUrl: e.target.value })}
              placeholder="https://myprotocol.xyz"
            />
          </Field>
        </div>
      </div>

      <div className="border-t border-white/70 pt-6">
        <SectionTitle>Description / Context</SectionTitle>
        <Field label="What the project does" hint="Context for posts and AI agents — audience, phase, differentiators.">
          <Textarea
            rows={4}
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="A short summary of the project, its audience, and its current phase."
          />
        </Field>
      </div>

      <div className="border-t border-white/70 pt-6">
        <SectionTitle>Brand voice</SectionTitle>
        <BrandVoiceEditor value={draft.brandVoice} onChange={setVoice} />
      </div>

      <div className="border-t border-white/70 pt-6">
        <SectionTitle>Content</SectionTitle>
        <div className="space-y-4">
          <Field label="Content pillars" hint="Recurring topics you post about — comma-separated.">
            <Input
              value={listToCsv(draft.contentPillars)}
              onChange={(e) => set({ contentPillars: csvToList(e.target.value) })}
              placeholder="product updates, memes, ecosystem news, AMAs"
            />
          </Field>

          <Field label="Sample posts you love" hint="Example tweets the AI should learn the style from — 2–3 is plenty.">
            <div className="space-y-2">
              {draft.samplePosts.map((sample, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Textarea
                    rows={2}
                    value={sample}
                    onChange={(e) => {
                      const next = [...draft.samplePosts]
                      next[i] = e.target.value
                      set({ samplePosts: next })
                    }}
                    placeholder="Paste a tweet you love…"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => set({ samplePosts: draft.samplePosts.filter((_, j) => j !== i) })}
                  >
                    ✕
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                onClick={() => set({ samplePosts: [...draft.samplePosts, ''] })}
              >
                + Add sample
              </Button>
            </div>
          </Field>

          <Field label="Custom instructions" hint="Anything else the AI must know when drafting.">
            <Textarea
              rows={3}
              value={draft.customInstructions}
              onChange={(e) => set({ customInstructions: e.target.value })}
              placeholder="e.g. Always mention we're audited. Never comment on token price."
            />
          </Field>
        </div>
      </div>

      <div className="border-t border-white/70 pt-6">
        <SectionTitle>Official links</SectionTitle>
        <Field label="Official links" hint="Website, Discord, Telegram, GitHub — agents cite these and never invent links.">
          <div className="space-y-2">
            {links.map((link, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  className="w-36"
                  value={link.label}
                  onChange={(e) => {
                    const next = [...links]
                    next[i] = { ...next[i], label: e.target.value }
                    setLinks(next)
                  }}
                  placeholder="Discord"
                />
                <Input
                  type="url"
                  value={link.url}
                  onChange={(e) => {
                    const next = [...links]
                    next[i] = { ...next[i], url: e.target.value }
                    setLinks(next)
                  }}
                  placeholder="https://discord.gg/…"
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLinks(links.filter((_, j) => j !== i))}
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLinks([...links, { label: '', url: '' }])}
            >
              + Add link
            </Button>
          </div>
        </Field>
      </div>

      <div className="flex gap-3 border-t border-white/70 pt-6">
        <Button type="submit" disabled={busy || !draft.name.trim()}>
          {busy ? 'Saving…' : initial ? 'Save changes' : 'Create project'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
