"use client";

import { putProjectUpdate } from "@/hooks/project-hooks-core";
import { useCallback, useState } from "react";

interface UpdateProjectOptions<T> {
  projectId?: string;
  setProject: (project: T) => void;
}

export function useProjectUpdater<T>({
  projectId,
  setProject,
}: UpdateProjectOptions<T>) {
  const [saving, setSaving] = useState(false);

  const updateProject = useCallback(
    async (body: Record<string, unknown>) => {
      setSaving(true);
      try {
        const result = await putProjectUpdate<T>({ projectId, body });
        if (result.ok) {
          setProject(result.data.project);
        }
        return result;
      } finally {
        setSaving(false);
      }
    },
    [projectId, setProject],
  );

  return {
    saving,
    updateProject,
  };
}
