"use client";

import { getStoredActiveProjectId } from "@/components/layout/shell-preferences";
import { useEffect, useState } from "react";

export function useActiveProject<T extends { id: string }>() {
  const [project, setProject] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.projects?.length > 0) {
          const activeProjectId = getStoredActiveProjectId();
          const resolvedProject =
            data.projects.find(
              (candidate: T) => candidate.id === activeProjectId,
            ) ?? data.projects[0];
          setProject(resolvedProject as T);
        }
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
