import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/context'
import {
  useCreateProject,
  useProjects,
  type ProjectInput,
} from '../features/projects/api'
import ProjectCard from '../features/projects/ProjectCard'
import ProjectForm from '../features/projects/ProjectForm'
import { Button, Card, Skeleton, ErrorBox } from '../components/ui'

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const projects = useProjects()
  const createProject = useCreateProject()
  const [creating, setCreating] = useState(false)

  const startCreate = () => {
    setCreating(true)
    createProject.reset()
  }

  const handleCreate = (input: ProjectInput) => {
    createProject.mutate(input, {
      onSuccess: () => setCreating(false),
    })
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-300">
            PostGen
          </Link>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Projects</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-zinc-500 sm:block">{user?.email}</span>
          <Link to="/settings">
            <Button variant="ghost">Settings</Button>
          </Link>
          <Button variant="ghost" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </header>

      <section className="mt-8">
        {creating ? (
          <Card className="max-w-2xl">
            <h2 className="mb-6 text-lg font-semibold">New project</h2>
            <ProjectForm
              busy={createProject.isPending}
              error={createProject.error instanceof Error ? createProject.error.message : null}
              onSubmit={handleCreate}
              onCancel={() => setCreating(false)}
            />
          </Card>
        ) : (
          <Button onClick={startCreate}>+ New project</Button>
        )}
      </section>

      <section className="mt-8">
        {projects.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : projects.error ? (
          <ErrorBox
            message={
              projects.error instanceof Error ? projects.error.message : 'Failed to load projects'
            }
          />
        ) : (projects.data ?? []).length === 0 && !creating ? (
          <Card className="border-dashed text-center">
            <h3 className="font-semibold text-zinc-200">No projects yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
              A project groups your posts, knowledge, sources, and media for one web3
              venture. Create your first one to get started.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(projects.data ?? []).map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
