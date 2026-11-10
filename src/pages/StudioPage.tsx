import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useDeleteStudioFile,
  useDeleteStudioJob,
  useStudioJobs,
  type StudioFile,
  type StudioJob,
} from '../features/studio/api'
import { formatBytes, getSignedUrl } from '../lib/media'
import { useProjects } from '../features/projects/api'
import { ErrorBox, Spinner } from '../components/ui'
import { cn } from '../lib/cn'
import { errorMessage } from '../features/prompts/api'

const STATUS: Record<StudioJob['status'], { label: string; tone: string }> = {
  open: { label: 'Waiting for visuals', tone: 'bg-amber-500/15 text-amber-900 dark:text-amber-200' },
  returned: { label: 'Visuals returned', tone: 'bg-violet-500/15 text-violet-900 dark:text-violet-200' },
  rendered: { label: 'Rendered', tone: 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-200' },
  archived: { label: 'Archived', tone: 'bg-black/10 text-ink-soft' },
}

function KindChip({ kind }: { kind: StudioFile['kind'] }) {
  const map: Record<StudioFile['kind'], string> = {
    handoff: 'bg-sky-500/15 text-sky-900 dark:text-sky-200',
    return: 'bg-violet-500/15 text-violet-900 dark:text-violet-200',
    render: 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-200',
    note: 'bg-black/10 text-ink-soft',
  }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide', map[kind])}>
      {kind}
    </span>
  )
}

/**
 * Studio — the per-film working folders.
 *
 * Each film gets one folder holding the recorded voice, the brief, the source and
 * whatever the visual specialist returned. The finished video lives on as a draft
 * post; these files are only here so a film can be edited or re-rendered later. Clear
 * a folder whenever you like — nothing in a post depends on it.
 */
export default function StudioPage() {
  const navigate = useNavigate()
  const studio = useStudioJobs()
  const projects = useProjects()
  const deleteJob = useDeleteStudioJob()
  const deleteFile = useDeleteStudioFile()
  const [open, setOpen] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  const jobs = studio.data?.jobs ?? []
  const files = studio.data?.files ?? []
  const totalBytes = files.reduce((n, f) => n + (f.size_bytes ?? 0), 0)
  const projectName = (id: string | null) =>
    (projects.data ?? []).find((p) => p.id === id)?.name ?? 'No project'

  if (studio.isLoading) {
    return (
      <div className="pg-shell flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="pg-shell">
      <div className="mx-auto max-w-[440px] px-5 pt-8 pb-36">
        <header className="flex items-center justify-between">
          <div>
            <p className="pg-title text-2xl leading-none text-ink">Studio</p>
            <p className="mt-1.5 text-[12px] font-bold text-ink-soft">
              Working files for videos · {jobs.length} folder{jobs.length === 1 ? '' : 's'} ·{' '}
              {formatBytes(totalBytes)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="pg-glass flex h-11 w-11 items-center justify-center rounded-full text-ink transition active:scale-95"
            aria-label="Back to projects"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </header>

        <p className="mt-4 rounded-2xl bg-black/[0.04] px-4 py-3 text-[12px] font-semibold leading-relaxed text-ink-soft dark:bg-white/5">
          Each folder holds one film's voice, source and returned scenes. The posted video does
          <span className="font-black text-ink"> not </span>
          use these files — clear a folder any time, or keep it to edit the video later.
        </p>

        {studio.isError && <ErrorBox message={errorMessage(studio.error, 'Could not load studio folders')} />}
        {deleteJob.isError && <ErrorBox message={errorMessage(deleteJob.error, 'Could not clear the folder')} />}

        {studio.data?.missing && (
          <p className="mt-6 rounded-2xl bg-amber-500/10 px-4 py-3 text-[12px] font-bold text-amber-900 dark:text-amber-200">
            The studio tables are not in the database yet — apply the latest Supabase migration.
          </p>
        )}

        <div className="mt-5 space-y-3">
          {jobs.length === 0 && !studio.data?.missing && (
            <p className="pg-glass rounded-3xl px-5 py-6 text-center text-[13px] font-bold text-ink-soft">
              No folders yet. Ask your agent for a video — it creates one here automatically.
            </p>
          )}

          {jobs.map((job) => {
            const jobFiles = files.filter((f) => f.job_id === job.id)
            const bytes = jobFiles.reduce((n, f) => n + (f.size_bytes ?? 0), 0)
            const isOpen = open === job.id
            const status = STATUS[job.status] ?? STATUS.open
            return (
              <section key={job.id} className="pg-glass overflow-hidden rounded-3xl">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : job.id)}
                  className="flex w-full items-start gap-3 px-4 py-4 text-left"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-ink dark:bg-white/10">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2.5" y="5" width="19" height="14" rx="3" />
                      <path d="M10 9.5l5 2.5-5 2.5z" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-black text-ink">{job.title}</span>
                      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide', status.tone)}>
                        {status.label}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-[11.5px] font-bold text-ink-soft">
                      {projectName(job.project_id)} · {jobFiles.length} file{jobFiles.length === 1 ? '' : 's'} · {formatBytes(bytes)}
                      {job.voice_name ? ` · ${job.voice_name.split(' - ')[0]}` : ''}
                    </span>
                  </span>
                  <span className={cn('mt-1 shrink-0 text-ink-soft transition', isOpen && 'rotate-90')}>›</span>
                </button>

                {isOpen && (
                  <div className="border-t border-black/5 px-4 py-3 dark:border-white/10">
                    {job.spec && typeof job.spec === 'object' && 'fps' in job.spec && (
                      <p className="mb-2 text-[11px] font-bold text-ink-soft">
                        {String(job.spec.width)}×{String(job.spec.height)} · {String(job.spec.fps)} fps ·{' '}
                        {String(job.spec.durationInFrames)} frames
                      </p>
                    )}
                    <ul className="space-y-1.5">
                      {jobFiles.map((file) => (
                        <li key={file.id} className="flex items-center gap-2">
                          <KindChip kind={file.kind} />
                          <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink" title={file.path}>
                            {file.path}
                          </span>
                          <span className="shrink-0 text-[11px] font-bold text-ink-soft">
                            {formatBytes(file.size_bytes ?? 0)}
                          </span>
                          <button
                            type="button"
                            title="Download"
                            onClick={() =>
                              void getSignedUrl(file.r2_key).then((url) => window.open(url, '_blank', 'noopener'))
                            }
                            className="shrink-0 rounded-full p-1.5 text-ink-soft transition hover:bg-black/5 active:scale-95 dark:hover:bg-white/10"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Delete this file"
                            onClick={() => deleteFile.mutate(file)}
                            className="shrink-0 rounded-full p-1.5 text-ink-soft transition hover:bg-rose-500/10 hover:text-rose-600 active:scale-95"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" />
                            </svg>
                          </button>
                        </li>
                      ))}
                      {jobFiles.length === 0 && (
                        <li className="text-[12px] font-bold text-ink-soft">Folder is empty.</li>
                      )}
                    </ul>

                    <div className="mt-3 flex items-center gap-2">
                      {job.project_id && (
                        <button
                          type="button"
                          onClick={() => navigate(`/projects/${job.project_id}`)}
                          className="rounded-full bg-black/[0.06] px-3 py-1.5 text-[11.5px] font-black text-ink transition active:scale-95 dark:bg-white/10"
                        >
                          Open project
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setConfirming(confirming === job.id ? null : job.id)}
                        className="ml-auto rounded-full bg-rose-500/10 px-3 py-1.5 text-[11.5px] font-black text-rose-700 transition active:scale-95 dark:text-rose-300"
                      >
                        Clear storage
                      </button>
                    </div>

                    {confirming === job.id && (
                      <div className="mt-2 rounded-2xl bg-rose-500/10 px-3 py-3">
                        <p className="text-[12px] font-bold leading-snug text-rose-800 dark:text-rose-200">
                          Delete all {jobFiles.length} working file{jobFiles.length === 1 ? '' : 's'} in this
                          folder? The posted video is not affected.
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              deleteJob.mutate(job.id)
                              setConfirming(null)
                              setOpen(null)
                            }}
                            disabled={deleteJob.isPending}
                            className="rounded-full bg-rose-600 px-3 py-1.5 text-[11.5px] font-black text-white transition active:scale-95 disabled:opacity-60"
                          >
                            {deleteJob.isPending ? 'Clearing…' : 'Yes, delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirming(null)}
                            className="rounded-full bg-black/[0.06] px-3 py-1.5 text-[11.5px] font-black text-ink dark:bg-white/10"
                          >
                            Keep
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
