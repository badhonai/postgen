import { useState, type FormEvent } from 'react'
import type { BrandVoice, ContractAddress, OfficialLink, Project } from '../../lib/types'
import { Button, ErrorBox, Field, Input, Textarea } from '../../components/ui'
import BrandVoiceEditor from './BrandVoiceEditor'
import type { ProjectInput } from './api'
import { EMPTY_PROJECT_INPUT, projectInputOf } from './api'

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
    <h3 className="mb-4 text-sm font-semibold tracking-wide text-zinc-300 uppercase">{children}</h3>
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
  const [contracts, setContracts] = useState<ContractAddress[]>(draft.contractAddresses)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.name.trim()) return
    onSubmit({ ...draft, officialLinks: links, contractAddresses: contracts })
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      {error ? <ErrorBox message={error} /> : null}

      <div className="space-y-4">
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
          <Field label="Chain / ecosystem" hint="Comma-separated.">
            <Input
              value={listToCsv(draft.chains)}
              onChange={(e) => set({ chains: csvToList(e.target.value) })}
              placeholder="Base, Solana"
            />
          </Field>
          <Field label="Token ticker" hint="Without the $.">
            <Input
              value={draft.tokenTicker}
              onChange={(e) => set({ tokenTicker: e.target.value })}
              placeholder="PROJ"
            />
          </Field>
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-6">
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

      <div className="border-t border-zinc-800 pt-6">
        <SectionTitle>Brand voice</SectionTitle>
        <BrandVoiceEditor value={draft.brandVoice} onChange={setVoice} />
      </div>

      <div className="border-t border-zinc-800 pt-6">
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

      <div className="border-t border-zinc-800 pt-6">
        <SectionTitle>Official links & contracts</SectionTitle>
        <div className="space-y-4">
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

          <Field label="Contract addresses" hint="Official CAs — agents will never invent one.">
            <div className="space-y-2">
              {contracts.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    className="w-28"
                    value={c.chain}
                    onChange={(e) => {
                      const next = [...contracts]
                      next[i] = { ...next[i], chain: e.target.value }
                      setContracts(next)
                    }}
                    placeholder="Base"
                  />
                  <Input
                    value={c.address}
                    onChange={(e) => {
                      const next = [...contracts]
                      next[i] = { ...next[i], address: e.target.value }
                      setContracts(next)
                    }}
                    placeholder="0x…"
                  />
                  <Input
                    className="w-28"
                    value={c.label ?? ''}
                    onChange={(e) => {
                      const next = [...contracts]
                      next[i] = { ...next[i], label: e.target.value }
                      setContracts(next)
                    }}
                    placeholder="Token"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setContracts(contracts.filter((_, j) => j !== i))}
                  >
                    ✕
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setContracts([...contracts, { chain: '', address: '', label: '' }])}
              >
                + Add contract
              </Button>
            </div>
          </Field>
        </div>
      </div>

      <div className="flex gap-3 border-t border-zinc-800 pt-6">
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
