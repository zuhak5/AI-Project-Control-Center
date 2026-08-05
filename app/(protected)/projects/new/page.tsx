import { NewProjectForm } from "@/components/new-project-form";
import { PageHeader } from "@/components/page-header";

export default function NewProjectPage() {
  return <div className="page-wrap narrow"><PageHeader eyebrow="Project registry" title="Register an AI project" description="Store operational metadata and environment-variable references. Provider credentials remain in Vercel." /><NewProjectForm /></div>;
}
