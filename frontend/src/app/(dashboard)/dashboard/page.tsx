"use client";

import { useRouter } from "next/navigation";
import { useProjects, type Project } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STATUS_COLORS: Record<string, string> = {
  eliciting: "bg-blue-100 text-blue-700",
  awaiting_answers: "bg-yellow-100 text-yellow-700",
  planning: "bg-purple-100 text-purple-700",
  synthesizing: "bg-indigo-100 text-indigo-700",
  critiquing: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={() => router.push(`/projects/${project.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{project.title}</CardTitle>
          <StatusBadge status={project.status} />
        </div>
        <CardDescription className="line-clamp-2">
          {project.initial_idea}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          Created {new Date(project.created_at).toLocaleDateString()}
          {project.completed_at &&
            ` · Completed ${new Date(project.completed_at).toLocaleDateString()}`}
        </p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { projects, isLoading } = useProjects();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Your AI prompt generation projects
          </p>
        </div>
        <Button onClick={() => router.push("/projects/new")}>
          New Project
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading projects...</p>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">
              No projects yet. Create your first one to get started.
            </p>
            <Button onClick={() => router.push("/projects/new")}>
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
