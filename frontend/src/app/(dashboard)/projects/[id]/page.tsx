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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);
  const { token } = useAuth();
  const { project, isLoading, mutate } = useProject(projectId);

  // Connect WebSocket for real-time updates
  const { lastEvent } = useSocket({
    token,
    projectId,
    onEvent: () => {
      // Refetch project data on any socket event
      mutate();
    },
  });

  // Redirect to prompts page when completed
  useEffect(() => {
    if (project?.status === "completed") {
      router.replace(`/projects/${projectId}/prompts`);
    }
  }, [project?.status, projectId, router]);

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  const status = project.status;
  const wd = (project as Record<string, unknown>).workflow_data as Record<
    string,
    unknown
  > | null;
  const questions = (wd?.questions as Array<{
    number: number;
    topic: string;
    text: string;
    options: string[];
  }>) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.initial_idea}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
          Back
        </Button>
      </div>

      {/* Stepper */}
      <WorkflowStepper status={status} />

      {/* Status-based content */}
      {(status === "eliciting") && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-blue-500" />
            <p className="text-sm text-muted-foreground">
              Analyzing your idea and generating questions...
            </p>
          </CardContent>
        </Card>
      )}

      {status === "awaiting_answers" && questions.length > 0 && (
        <QuestionForm
          projectId={projectId}
          questions={questions}
          onSubmitted={() => mutate()}
        />
      )}

      {status === "awaiting_answers" && questions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-blue-500" />
            <p className="text-sm text-muted-foreground">
              Waiting for questions to be generated...
            </p>
          </CardContent>
        </Card>
      )}

      {(status === "planning" || status === "awaiting_approval") && (
        <div className="space-y-4">
          {project.spec_md ? (
            <SpecPreview
              specMd={project.spec_md}
              techStack={wd?.tech_stack as Record<string, string[]> | undefined}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-purple-500" />
                <p className="text-sm text-muted-foreground">
                  Building your app&apos;s architecture...
                </p>
                <EstimatedTime status={status} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {(status === "synthesizing" || status === "critiquing" || status === "refining") && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-indigo-500" />
            <p className="text-sm text-muted-foreground">
              {status === "synthesizing" && "Writing optimized prompts..."}
              {status === "critiquing" && "Reviewing prompt quality..."}
              {status === "refining" && "Refining prompts based on review..."}
            </p>
            <EstimatedTime status={status} />
          </CardContent>
        </Card>
      )}

      {status === "failed" && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-red-600">
              Workflow Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {(wd?.error as string) || "An unexpected error occurred."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => router.push("/dashboard")}
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Socket connection indicator */}
      {lastEvent && (
        <p className="text-xs text-muted-foreground">
          Last update: {lastEvent.type} &mdash;{" "}
          {(lastEvent.data as Record<string, unknown>)?.message as string || ""}
        </p>
      )}
    </div>
  );
}
