import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { BrandVoice, OfficialLink, Project } from '../../lib/types'
import { Button, ErrorBox, Field, Input, Textarea } from '../../components/ui'
import BrandVoiceEditor from './BrandVoiceEditor'
import type { ProjectInput } from './api'
import { EMPTY_PROJECT_INPUT, projectInputOf } from './api'

type QueuedFile = { file: File; url: string }

const STEPS = ['Identity', 'About', 'Content'] as const

function csvToList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function listToCsv(list: string[] | undefined): string {
  return (list ?? []).join(', ')
}

function StepLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">
      {children}
    </p>
  )
}

/**
 * Comma-separated list input that keeps the RAW text while typing
 * (commas and trailing spaces must survive keystrokes) and exposes the
 * parsed array to the form.
 */
function CsvInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  const [text, setText] = useState(() => listToCsv(value))
  return (
    <Input
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        onChange(csvToList(e.target.value))
      }}
      placeholder={placeholder}
    />
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
    <div>
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
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Add logo & assets"
          className="flex h-[88px] w-[88px] shrink-0 flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed border-white/80 bg-white/40 text-ink transition hover:bg-white/60 active:scale-95"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="text-[10px] font-extrabold text-ink-soft">Logo</span>
        </button>

        {queued.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {queued.map((q, i) => (
              <div
                key={q.url}
                className={`group relative h-[88px] w-[88px] overflow-hidden rounded-[18px] border bg-white/70 ${
                  effectiveLogo === i
                    ? 'border-butter-deep ring-2 ring-butter-deep'
                    : 'border-white/80'
                }`}
              >
                <button
                  type="button"
                  className="block h-full w-full"
                  onClick={() => onLogoIndex(effectiveLogo === i ? null : i)}
                  title="Set as project logo"
                >
                  {q.file.type.startsWith('image/') ? (
                    <img src={q.url} alt={q.file.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-3xl">🎬</span>
                  )}
                </button>
                {effectiveLogo === i ? (
                  <span className="absolute top-1 left-1 rounded-full bg-butter px-1.5 py-0.5 text-[9px] font-bold text-ink">
                    Logo
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label="Remove"
                  className="absolute top-1 right-1 rounded-full bg-ink/75 px-1.5 text-[10px] leading-4 text-white"
                  onClick={() => onRemove(i)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
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
  const [step, setStep] = useState(0)
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
    if (step < STEPS.length - 1) {
      setStep(step + 1)
      return
    }
    if (!draft.name.trim()) {
      setStep(0)
      return
    }
    onSubmit({
      ...draft,
      officialLinks: links,
      newAssets: queued.map((q) => q.file),
      newLogoIndex: logoIndex,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* progress */}
      <div>
        <div className="flex gap-1.5">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => setStep(i)}
              className={`h-2 flex-1 rounded-full transition ${
                i <= step
                  ? 'bg-butter shadow-[0_4px_12px_rgba(242,193,78,0.5)]'
                  : 'bg-white/55'
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">
          Step {step + 1} · {STEPS[step]}
        </p>
      </div>

      {error ? <ErrorBox message={error} /> : null}

      {/* ── Step 1 · Identity ── */}
      {step === 0 ? (
        <div key="s0" className="space-y-5">
          <div>
            <StepLabel>Logo & assets</StepLabel>
            <div className="mt-2.5">
              <LogoAssetsField
                queued={queued}
                logoIndex={logoIndex}
                onAdd={addQueued}
                onRemove={removeQueued}
                onLogoIndex={setLogoIndex}
              />
            </div>
          </div>
          <Field label="Project name">
            <Input
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="My DeFi Protocol"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="X username">
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
                placeholder="https://…"
              />
            </Field>
          </div>
        </div>
      ) : null}

      {/* ── Step 2 · About ── */}
      {step === 1 ? (
        <div key="s1" className="space-y-5">
          <Field label="What the project does">
            <Textarea
              rows={5}
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="One short summary — audience, phase, what makes it different."
            />
          </Field>
          <div>
            <StepLabel>Voice</StepLabel>
            <div className="mt-2.5">
              <BrandVoiceEditor value={draft.brandVoice} onChange={setVoice} />
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Step 3 · Content ── */}
      {step === 2 ? (
        <div key="s2" className="space-y-5">
          <Field label="Content pillars">
            <CsvInput
              value={draft.contentPillars}
              onChange={(next) => set({ contentPillars: next })}
              placeholder="product updates, memes, AMAs"
            />
          </Field>

          <Field label="Sample posts">
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

          <Field label="Custom instructions">
            <Textarea
              rows={3}
              value={draft.customInstructions}
              onChange={(e) => set({ customInstructions: e.target.value })}
              placeholder="e.g. Always mention audits. Never comment on price."
            />
          </Field>

          <Field label="Official links">
            <div className="space-y-2">
              {links.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-[84px] shrink-0">
                    <Input
                      value={link.label}
                      onChange={(e) => {
                        const next = [...links]
                        next[i] = { ...next[i], label: e.target.value }
                        setLinks(next)
                      }}
                      placeholder="Label"
                    />
                  </div>
                  <Input
                    className="min-w-0 flex-1"
                    inputMode="url"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={link.url}
                    onChange={(e) => {
                      const next = [...links]
                      next[i] = { ...next[i], url: e.target.value }
                      setLinks(next)
                    }}
                    placeholder="https://…"
                  />
                  <button
                    type="button"
                    aria-label="Remove link"
                    onClick={() => setLinks(links.filter((_, j) => j !== i))}
                    className="pg-glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-ink-soft transition active:scale-95"
                  >
                    ✕
                  </button>
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
      ) : null}

      {/* footer */}
      <div className="sticky bottom-0 -mx-6 -mb-2 flex gap-3 border-t border-white/70 bg-[#f4f2fb] px-6 pt-4 pb-2">
        {step > 0 ? (
          <Button type="button" variant="ghost" onClick={() => setStep(step - 1)} disabled={busy}>
            Back
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={busy || (step === STEPS.length - 1 && !draft.name.trim())}
          className="flex-1"
        >
          {busy
            ? 'Saving…'
            : step < STEPS.length - 1
              ? 'Next →'
              : initial
                ? 'Save changes'
                : 'Create project'}
        </Button>
      </div>
    </form>
  )
}
