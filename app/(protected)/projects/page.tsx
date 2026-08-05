import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ProjectCard } from "@/components/project-card";
import { latestProjectStatus, projectUsage } from "@/lib/metrics";
import { hasProviderSecret } from "@/lib/security";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const state = await getState();
  return <div className="page-wrap">
    <PageHeader eyebrow="Project registry" title="AI projects" description="Provider connections, secret references, budgets, model allowlists, health checks, and telemetry identities." actions={<Link className="button primary" href="/projects/new">Add project</Link>} />
    {state.projects.length ? <section className="project-grid">{state.projects.map((project) => <ProjectCard key={project.id} project={project} status={latestProjectStatus(state, project)} usage={projectUsage(state, project.id)} apiKeyConfigured={hasProviderSecret(project.apiKeyEnv)} />)}</section> : <EmptyState title="No projects yet" description="Register any AI-enabled service or direct provider connection." actionHref="/projects/new" actionLabel="Add project" />}
  </div>;
}
