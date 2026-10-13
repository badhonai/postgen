import { useState, type FormEvent } from 'react'
import type { BrandVoice, Project } from '../../lib/types'
import { Button, ErrorBox, Field, Input, Textarea } from '../../components/ui'
import BrandVoiceEditor from './BrandVoiceEditor'
import type { ProjectInput } from './api'

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
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [brandVoice, setBrandVoice] = useState<BrandVoice>(initial?.brand_voice ?? {})

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), description, brandVoice })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error ? <ErrorBox message={error} /> : null}

      <div className="space-y-4">
        <Field label="Project name" hint={initial ? `Slug: ${initial.slug}` : 'A URL slug is generated automatically.'}>
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My DeFi Protocol"
          />
        </Field>
        <Field label="Description" hint="What the project does — context for posts and AI agents.">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short summary of the project, its audience, and its current phase."
          />
        </Field>
      </div>

      <div className="border-t border-zinc-800 pt-6">
        <h3 className="mb-4 text-sm font-semibold tracking-wide text-zinc-300 uppercase">
          Brand voice
        </h3>
        <BrandVoiceEditor value={brandVoice} onChange={setBrandVoice} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={busy || !name.trim()}>
          {busy ? 'Saving…' : initial ? 'Save changes' : 'Create project'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
