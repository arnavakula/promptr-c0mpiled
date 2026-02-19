"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";

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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const placeholder = PLACEHOLDERS[projectType] ?? PLACEHOLDERS.build;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const project = await createProject(
        title,
        idea,
        projectType,
        codebaseContext || undefined,
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
    <div className="mx-auto max-w-lg">
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
                className={`flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-all duration-200 ${
                  projectType === type.value
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
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
            className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
            className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="e.g. Next.js 14 app with TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL. The main pages are in /app and API routes in /app/api..."
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}
