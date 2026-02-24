"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { AnimatedBlobs } from "@/components/ui/AnimatedBlobs";

const PROJECT_TYPES = [
  {
    value: "build",
    label: "Build from scratch",
    description: "Create a brand new app or project",
    icon: "🏗",
  },
  {
    value: "enhance",
    label: "Add a feature",
    description: "Add new functionality to an existing app",
    icon: "✨",
  },
  {
    value: "refactor",
    label: "Refactor / improve",
    description: "Improve code quality, performance, or architecture",
    icon: "🔧",
  },
  {
    value: "debug",
    label: "Fix a bug",
    description: "Diagnose and fix a problem in your code",
    icon: "🐛",
  },
] as const;

const PLACEHOLDERS: Record<string, { idea: string; title: string }> = {
  build: {
    title: "My Fitness App",
    idea: "I want to build a fitness tracking app that lets users log workouts, track calories, and see progress charts...",
  },
  enhance: {
    title: "Add Dark Mode to My App",
    idea: "I want to add a dark mode toggle to my existing React dashboard app. It should remember the user's preference...",
  },
  refactor: {
    title: "Refactor Auth System",
    idea: "Our authentication code is scattered across multiple files and hard to maintain. I want to consolidate it into a clean auth module...",
  },
  debug: {
    title: "Fix Login Redirect Bug",
    idea: "After logging in, users are sometimes redirected to a blank page instead of the dashboard. It happens intermittently...",
  },
};

export default function NewProjectPage() {
  const router = useRouter();
  const { createProject } = useProjects();
  const [projectType, setProjectType] = useState("build");
  const [title, setTitle] = useState("");
  const [idea, setIdea] = useState("");
  const [codebaseContext, setCodebaseContext] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const placeholder = PLACEHOLDERS[projectType] ?? PLACEHOLDERS.build;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileContent((ev.target?.result as string) || "");
    };
    reader.onerror = () => {
      console.error("Failed to read file with FileReader");
      setUploadedFile(null);
      setFileContent("");
      setError("Failed to read the selected file. Please check the file and try again.");
    };
    reader.readAsText(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFileContent("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let finalContext = codebaseContext;
      if (fileContent) {
        const separator = `\n\n---\n\n## Uploaded Context File: ${uploadedFile?.name}\n\n`;
        finalContext = finalContext
          ? finalContext + separator + fileContent
          : separator.trimStart() + fileContent;
      }
      const project = await createProject(
        title,
        idea,
        projectType,
        finalContext || undefined,
      );
      router.push(`/projects/${project.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to create project. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatedBlobs />
      <div className="relative z-10 mx-auto max-w-lg">
        <div className="mb-8">
          <h1 className="text-[22px] text-gray-900">New project</h1>
          <p className="mt-1 text-sm text-gray-500">
            Describe what you want to accomplish and we&apos;ll generate tailored prompts for AI coding assistants.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Project type selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
              What do you need?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROJECT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setProjectType(type.value)}
                  className={`flex flex-col items-start rounded-lg border px-3 py-2.5 text-left backdrop-blur-md transition-all duration-200 ${
                    projectType === type.value
                      ? "border-gray-900 bg-gray-50/80 ring-2 ring-gray-900/10"
                      : "border-gray-200/80 bg-white/70 hover:border-gray-300 hover:bg-white/90"
                  }`}
                >
                  <span className="text-base">{type.icon}</span>
                  <span className="mt-1 text-sm font-medium text-gray-900">
                    {type.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {type.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="title" className="block text-xs font-medium uppercase tracking-wide text-gray-500">
              Project title
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="block w-full rounded-lg border border-gray-200/80 bg-white/70 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none backdrop-blur-md transition-all duration-200 focus:border-gray-900 focus:bg-white/90 focus:ring-2 focus:ring-gray-900/10"
              placeholder={placeholder.title}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="idea" className="block text-xs font-medium uppercase tracking-wide text-gray-500">
              {projectType === "build" ? "Describe your idea" : "Describe what you need"}
            </label>
            <textarea
              id="idea"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={5}
              className="block w-full rounded-lg border border-gray-200/80 bg-white/70 px-3 py-2.5 text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 outline-none backdrop-blur-md transition-all duration-200 focus:border-gray-900 focus:bg-white/90 focus:ring-2 focus:ring-gray-900/10"
              placeholder={placeholder.idea}
              required
            />
          </div>

          {/* Codebase context — shown for non-build types */}
          {projectType !== "build" && (
            <div className="space-y-1.5">
              <label htmlFor="codebase" className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                Describe your codebase
                <span className="ml-1 font-normal normal-case tracking-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                id="codebase"
                value={codebaseContext}
                onChange={(e) => setCodebaseContext(e.target.value)}
                rows={4}
                className="block w-full rounded-lg border border-gray-200/80 bg-white/70 px-3 py-2.5 text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 outline-none backdrop-blur-md transition-all duration-200 focus:border-gray-900 focus:bg-white/90 focus:ring-2 focus:ring-gray-900/10"
                placeholder="e.g. Next.js 14 app with TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL. The main pages are in /app and API routes in /app/api..."
              />

              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-500">
                  Upload a context file
                  <span className="ml-1 font-normal text-gray-400">(e.g. CLAUDE.md, README.md)</span>
                </label>
                {uploadedFile ? (
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200/80 bg-white/60 px-3 py-2 text-sm text-gray-700 backdrop-blur-md">
                    <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    <span className="truncate">{uploadedFile.name}</span>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="ml-auto shrink-0 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300/80 bg-white/50 px-3 py-2.5 text-sm text-gray-500 backdrop-blur-md transition-all duration-200 hover:border-gray-400 hover:bg-white/70">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    Choose file
                    <input
                      type="file"
                      accept=".md"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-200/80 bg-white/70 px-4 py-2.5 text-sm font-medium text-gray-700 backdrop-blur-md transition-all duration-200 hover:bg-white/90 active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
