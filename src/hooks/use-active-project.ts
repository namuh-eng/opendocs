"use client";

import { getStoredActiveProjectId } from "@/components/layout/shell-preferences";
import { selectActiveProject } from "@/hooks/project-hooks-core";
import { useEffect, useState } from "react";

export function useActiveProject<T extends { id: string }>() {
  const [project, setProject] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        const resolvedProject = selectActiveProject<T>({
          projects: data.projects ?? [],
          activeProjectId: getStoredActiveProjectId(),
        });
        setProject(resolvedProject);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return {
    project,
    setProject,
    loading,
  };
}
