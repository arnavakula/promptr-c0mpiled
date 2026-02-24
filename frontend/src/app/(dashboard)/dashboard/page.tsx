"use client";

import { useRouter } from "next/navigation";
import { useProjects, type Project } from "@/hooks/useProjects";

const STATUS_META: Record<string, { color: string; label: string; animate?: boolean }> = {
  eliciting: { color: "bg-blue-500", label: "Generating questions", animate: true },
  awaiting_answers: { color: "bg-amber-500", label: "Awaiting answers" },
  planning: { color: "bg-violet-500", label: "Building architecture", animate: true },
  awaiting_approval: { color: "bg-violet-500", label: "Awaiting approval" },
  synthesizing: { color: "bg-indigo-500", label: "Writing prompts", animate: true },
  critiquing: { color: "bg-orange-500", label: "Reviewing", animate: true },
  refining: { color: "bg-orange-500", label: "Refining", animate: true },
  completed: { color: "bg-emerald-500", label: "Completed" },
  failed: { color: "bg-red-500", label: "Failed" },
};

function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const meta = STATUS_META[project.status] ?? { color: "bg-gray-400", label: project.status };

  return (
    <button
      onClick={() => router.push(`/projects/${project.id}`)}
      className="group w-full rounded-xl bg-white p-6 text-left shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-[15px] font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
          {project.title}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0 ml-3">
          <span className={`relative h-1.5 w-1.5 rounded-full ${meta.color}`}>
            {meta.animate && (
              <span className={`absolute inset-0 rounded-full ${meta.color} animate-ping opacity-75`} />
            )}
          </span>
          <span className="text-xs text-gray-500">{meta.label}</span>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-500">
        {project.initial_idea}
      </p>
      <p className="mt-4 text-xs text-gray-400">
        {new Date(project.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
      <div className="flex items-start justify-between">
        <div className="skeleton h-4 w-36" />
        <div className="skeleton h-3 w-20" />
      </div>
      <div className="skeleton mt-3 h-3 w-full" />
      <div className="skeleton mt-2 h-3 w-2/3" />
      <div className="skeleton mt-4 h-3 w-16" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { projects, isLoading } = useProjects();

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-[22px] text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your prompt generation projects
          </p>
        </div>
        <button
          onClick={() => router.push("/projects/new")}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-600 active:scale-[0.98]"
        >
          New project
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center py-20">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <h3 className="mt-4 text-sm font-medium text-gray-900">No projects yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create your first project to get started.</p>
          <button
            onClick={() => router.push("/projects/new")}
            className="mt-5 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-600 active:scale-[0.98]"
          >
            New project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
