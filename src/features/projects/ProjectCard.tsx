import { Link } from 'react-router-dom'
import type { Project } from '../../lib/types'
import { Card } from '../../components/ui'
import { useAssetUrl } from '../../lib/media'

export default function ProjectCard({ project }: { project: Project }) {
  const logo = useAssetUrl(project.logo?.r2_key)

  return (
    <Link to={`/projects/${project.id}`} className="group block">
      <Card className="h-full transition-colors group-hover:border-zinc-700">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {logo.data ? (
              <img
                src={logo.data}
                alt=""
                className="h-10 w-10 rounded-lg border border-zinc-800 object-cover"
              />
            ) : null}
            <div>
              <h3 className="font-semibold text-zinc-100 group-hover:text-emerald-300">
                {project.name}
              </h3>
              {project.x_username ? (
                <p className="text-xs text-zinc-500">@{project.x_username}</p>
              ) : null}
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
            {project.slug}
          </span>
        </div>
        <p className="mt-2 line-clamp-3 text-sm text-zinc-400">
          {project.description || 'No description yet.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {(project.content_pillars ?? []).slice(0, 3).map((c) => (
            <span key={c} className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-xs text-zinc-400">
              {c}
            </span>
          ))}
          {project.brand_voice.tone ? (
            <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-xs text-zinc-400">
              🎙 {project.brand_voice.tone}
            </span>
          ) : null}
        </div>
      </Card>
    </Link>
  )
}
