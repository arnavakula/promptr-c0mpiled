"use client";

import useSWR from "swr";
import api from "@/lib/api-client";

export interface Project {
  id: number;
  user_id: number;
  title: string;
  initial_idea: string;
  project_type: string;
  codebase_context: string | null;
  status: string;
  current_stage: string | null;
  spec_md: string | null;
  final_prompts: Record<string, unknown>[] | null;
  refinement_count: number;
  max_refinements: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  workflow_data?: {
    questions?: Array<{
      number: number;
      topic: string;
      text: string;
      options: string[];
    }>;
    tech_stack?: Record<string, string[]>;
    error?: string;
    [key: string]: unknown;
  } | null;
}

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR<Project[]>(
    "/api/projects",
    fetcher,
    { refreshInterval: 5000 },
  );

  const createProject = async (
    title: string,
    initialIdea: string,
    projectType: string = "build",
    codebaseContext?: string,
  ) => {
    const res = await api.post("/api/projects", {
      title,
      initial_idea: initialIdea,
      project_type: projectType,
      ...(codebaseContext ? { codebase_context: codebaseContext } : {}),
    });
    await mutate();
    return res.data as Project;
  };

  return {
    projects: data ?? [],
    isLoading,
    error,
    mutate,
    createProject,
  };
}

export function useProject(id: number | null) {
  const { data, error, isLoading, mutate } = useSWR<Project>(
    id ? `/api/projects/${id}` : null,
    fetcher,
    { refreshInterval: 3000 },
  );

  return { project: data ?? null, isLoading, error, mutate };
}
