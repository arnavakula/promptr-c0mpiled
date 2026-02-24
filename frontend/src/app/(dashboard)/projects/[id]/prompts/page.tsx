"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import JSZip from "jszip";
import api from "@/lib/api-client";
import { useProject } from "@/hooks/useProjects";
import { PromptCard } from "@/components/project/PromptCard";

interface ParsedPrompt {
  number: number;
  title: string;
  content: string;
}

const promptsFetcher = (url: string) => api.get(url).then((r) => r.data);

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export default function PromptsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);
  const { project, mutate: mutateProject } = useProject(projectId);

  const { data: promptsData, mutate: mutatePrompts } = useSWR(
    `/api/projects/${projectId}/prompts`,
    promptsFetcher,
    { refreshInterval: 5000 },
  );

  const prompts: ParsedPrompt[] = promptsData?.prompts ?? [];
  const canRefine =
    project && project.refinement_count < project.max_refinements;

  // Refinement modal state
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [targetSection, setTargetSection] = useState(1);
  const [feedback, setFeedback] = useState("");
  const [refineLoading, setRefineLoading] = useState(false);
  const [refineError, setRefineError] = useState("");
  const [refineSuccess, setRefineSuccess] = useState("");

  // Close modal on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setShowRefineModal(false);
  }, []);

  useEffect(() => {
    if (showRefineModal) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [showRefineModal, handleKeyDown]);

  const openRefineModal = (promptNumber?: number) => {
    setTargetSection(promptNumber ?? 1);
    setFeedback("");
    setRefineError("");
    setRefineSuccess("");
    setShowRefineModal(true);
  };

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
      mutateProject();
      setTimeout(() => {
        mutatePrompts();
        mutateProject();
        setRefineSuccess("");
        setShowRefineModal(false);
      }, 3000);
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
      <div className="mx-auto max-w-[800px] px-6 py-10">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-[800px] px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-4 text-sm text-gray-400 transition-colors duration-200 hover:text-gray-900"
          >
            &larr; Back to dashboard
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900">
                {project.title}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {prompts.length} prompt{prompts.length !== 1 ? "s" : ""} generated
                {project.refinement_count > 0 && (
                  <span className="text-gray-400">
                    {" "}&middot; {project.refinement_count}/{project.max_refinements} refinements used
                  </span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {canRefine && prompts.length > 0 && (
                <button
                  onClick={() => openRefineModal()}
                  disabled={project.status === "refining"}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {project.status === "refining" ? "Refining..." : "Refine"}
                </button>
              )}
              {prompts.length > 0 && (
                <button
                  onClick={handleDownload}
                  className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-600 active:scale-[0.98]"
                >
                  Download all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Refining indicator */}
        {project.status === "refining" && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
            <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
            <p className="text-sm text-orange-700">
              Refining prompt...
              This may take a couple of minutes.
            </p>
          </div>
        )}

        {/* Prompts list */}
        {prompts.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl bg-white py-16 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            {project.status === "completed" ? (
              <p className="text-sm text-gray-500">
                No prompts available. The workflow may have encountered an issue.
              </p>
            ) : (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
                <p className="text-sm text-gray-500">
                  Prompts are still being generated...
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {prompts.map((prompt) => (
              <PromptCard key={prompt.number} prompt={prompt} />
            ))}
          </div>
        )}

        {/* Refinement info when exhausted */}
        {prompts.length > 0 && !canRefine && project.refinement_count > 0 && (
          <p className="mt-6 text-center text-xs text-gray-400">
            All {project.max_refinements} refinements have been used.
          </p>
        )}
      </div>

      {/* Refinement modal */}
      {showRefineModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowRefineModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Refine a prompt
              </h2>
              <button
                onClick={() => setShowRefineModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="modal-target"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500"
                >
                  Prompt number
                </label>
                <input
                  id="modal-target"
                  type="number"
                  min={1}
                  max={prompts.length}
                  value={targetSection}
                  onChange={(e) => setTargetSection(Number(e.target.value))}
                  className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label
                  htmlFor="modal-feedback"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500"
                >
                  What would you like to change?
                </label>
                <textarea
                  id="modal-feedback"
                  placeholder="e.g., Add more detail about authentication flow, include JWT setup steps..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {refineError && (
                <p className="text-sm text-red-600">{refineError}</p>
              )}
              {refineSuccess && (
                <p className="text-sm text-emerald-600">{refineSuccess}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowRefineModal(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefine}
                  disabled={refineLoading || !feedback.trim()}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50"
                >
                  {refineLoading ? "Refining..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
