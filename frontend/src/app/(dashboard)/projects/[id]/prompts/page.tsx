"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import JSZip from "jszip";
import api from "@/lib/api-client";
import { useProject } from "@/hooks/useProjects";
import { PromptCard } from "@/components/project/PromptCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ParsedPrompt {
  number: number;
  title: string;
  content: string;
}

const promptsFetcher = (url: string) => api.get(url).then((r) => r.data);

export default function PromptsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);
  const { project } = useProject(projectId);

  const { data: promptsData, mutate: mutatePrompts } = useSWR(
    `/api/projects/${projectId}/prompts`,
    promptsFetcher,
    { refreshInterval: 5000 },
  );

  const prompts: ParsedPrompt[] = promptsData?.prompts ?? [];
  const canRefine =
    project && project.refinement_count < project.max_refinements;

  // Refinement form
  const [targetSection, setTargetSection] = useState(1);
  const [feedback, setFeedback] = useState("");
  const [refineLoading, setRefineLoading] = useState(false);
  const [refineError, setRefineError] = useState("");
  const [refineSuccess, setRefineSuccess] = useState("");

  const handleRefine = async () => {
    setRefineError("");
    setRefineSuccess("");
    setRefineLoading(true);
    try {
      await api.post(`/api/projects/${projectId}/refine`, {
        target_section: targetSection,
        feedback,
      });
      setRefineSuccess("Refinement started. Prompts will update shortly.");
      setFeedback("");
      setTimeout(() => {
        mutatePrompts();
        setRefineSuccess("");
      }, 5000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Refinement request failed";
      setRefineError(msg);
    } finally {
      setRefineLoading(false);
    }
  };

  const handleDownload = async () => {
    if (prompts.length === 0) return;
    try {
      const zip = new JSZip();
      const prefix = project?.title?.replace(/\s+/g, "_") || "prompts";

      for (const prompt of prompts) {
        const filename = `${String(prompt.number).padStart(2, "0")}_${prompt.title.replace(/[^a-zA-Z0-9_ -]/g, "").replace(/\s+/g, "_")}.md`;
        const content = `# Prompt ${prompt.number}: ${prompt.title}\n\n${prompt.content}`;
        zip.file(filename, content);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${prefix}_prompts.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed. Make sure prompts have been generated.");
    }
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {prompts.length} prompts generated
            {project.refinement_count > 0 &&
              ` · ${project.refinement_count}/${project.max_refinements} refinements used`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
            Dashboard
          </Button>
          {prompts.length > 0 && (
            <Button size="sm" onClick={handleDownload}>
              Download All
            </Button>
          )}
        </div>
      </div>

      {/* Prompts */}
      {prompts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            {project.status === "completed" ? (
              <p className="text-sm text-muted-foreground">
                No prompts available. The workflow may have encountered an issue.
              </p>
            ) : (
              <>
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-blue-500" />
                <p className="text-sm text-muted-foreground">
                  Prompts are still being generated...
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {prompts.map((prompt) => (
            <PromptCard key={prompt.number} prompt={prompt} />
          ))}
        </div>
      )}

      {/* Refinement section */}
      {prompts.length > 0 && (
        <>
          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Refine a Prompt</CardTitle>
              <CardDescription>
                {canRefine
                  ? `You have ${project.max_refinements - project.refinement_count} refinement(s) remaining.`
                  : "You've used all available refinements."}
              </CardDescription>
            </CardHeader>
            {canRefine && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="targetSection">Prompt Number</Label>
                  <Input
                    id="targetSection"
                    type="number"
                    min={1}
                    max={prompts.length}
                    value={targetSection}
                    onChange={(e) => setTargetSection(Number(e.target.value))}
                    className="w-24"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feedback">What should change?</Label>
                  <Textarea
                    id="feedback"
                    placeholder="e.g., Add more detail about authentication flow, include JWT setup steps..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                  />
                </div>

                {refineError && (
                  <p className="text-sm text-red-500">{refineError}</p>
                )}
                {refineSuccess && (
                  <p className="text-sm text-green-600">{refineSuccess}</p>
                )}

                <Button
                  onClick={handleRefine}
                  disabled={refineLoading || !feedback.trim()}
                >
                  {refineLoading ? "Refining..." : "Request Refinement"}
                </Button>
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
