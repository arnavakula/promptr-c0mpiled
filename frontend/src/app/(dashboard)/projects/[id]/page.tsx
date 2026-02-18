"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProject } from "@/hooks/useProjects";
import { useAuth } from "@/lib/auth";
import { useSocket } from "@/hooks/useSocket";
import { WorkflowStepper } from "@/components/project/WorkflowStepper";
import { QuestionForm } from "@/components/project/QuestionForm";
import { SpecPreview } from "@/components/project/SpecPreview";
import { EstimatedTime } from "@/components/project/EstimatedTime";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);
  const { token } = useAuth();
  const { project, isLoading, mutate } = useProject(projectId);

  useSocket({
    token,
    projectId,
    onEvent: () => {
      mutate();
    },
  });

  useEffect(() => {
    if (project?.status === "completed") {
      router.replace(`/projects/${projectId}/prompts`);
    }
  }, [project?.status, projectId, router]);

  if (isLoading || !project) {
    return (
      <div className="mx-auto flex max-w-[1100px] gap-12 px-6 py-10">
        <div className="w-[200px] shrink-0 space-y-3">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  const status = project.status;
  const wd = project.workflow_data ?? null;
  const questions = wd?.questions ?? [];

  return (
    <div className="mx-auto flex max-w-[1100px] gap-12 px-6 py-10">
      {/* Left sidebar — stepper */}
      <aside className="sticky top-10 hidden h-fit w-[200px] shrink-0 md:block">
        <WorkflowStepper status={status} />
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1 max-w-[800px]">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-4 text-sm text-gray-400 transition-colors duration-200 hover:text-gray-900"
          >
            &larr; Back to dashboard
          </button>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            {project.title}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{project.initial_idea}</p>
        </div>

        {/* Mobile stepper */}
        <div className="mb-8 md:hidden">
          <WorkflowStepper status={status} />
        </div>

        {/* Status-based content */}
        {status === "eliciting" && (
          <div className="flex flex-col items-center gap-4 rounded-xl bg-white py-16 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
            <p className="text-sm text-gray-500">
              Analyzing your idea and generating questions...
            </p>
          </div>
        )}

        {status === "awaiting_answers" && questions.length > 0 && (
          <QuestionForm
            projectId={projectId}
            questions={questions}
            onSubmitted={() => mutate()}
          />
        )}

        {status === "awaiting_answers" && questions.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-xl bg-white py-16 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
            <p className="text-sm text-gray-500">
              Waiting for questions to be generated...
            </p>
          </div>
        )}

        {(status === "planning" || status === "awaiting_approval") && (
          <>
            {project.spec_md ? (
              <SpecPreview
                specMd={project.spec_md}
                techStack={wd?.tech_stack}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-xl bg-white py-16 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
                <p className="text-sm text-gray-500">
                  Building your app&apos;s architecture...
                </p>
                <EstimatedTime status={status} />
              </div>
            )}
          </>
        )}

        {(status === "synthesizing" || status === "critiquing" || status === "refining") && (
          <div className="flex flex-col items-center gap-4 rounded-xl bg-white py-16 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
            <p className="text-sm text-gray-500">
              {status === "synthesizing" && "Writing optimized prompts..."}
              {status === "critiquing" && "Reviewing prompt quality..."}
              {status === "refining" && "Refining prompts based on review..."}
            </p>
            <EstimatedTime status={status} />
          </div>
        )}

        {status === "failed" && (
          <div className="rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <p className="text-sm font-medium text-red-600">Workflow Failed</p>
            <p className="mt-2 text-sm text-gray-500">
              {wd?.error || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-4 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
