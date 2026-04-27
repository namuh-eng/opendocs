export function selectActiveProject<T extends { id: string }>(params: {
  projects: T[];
  activeProjectId?: string | null;
}): T | null {
  if (params.projects.length === 0) {
    return null;
  }

  return (
    params.projects.find((project) => project.id === params.activeProjectId) ??
    params.projects[0]
  );
}

export async function putProjectUpdate<T>(params: {
  projectId?: string;
  body: Record<string, unknown>;
}): Promise<
  | { ok: true; data: { project: T } }
  | { ok: false; error: string; data?: unknown }
> {
  if (!params.projectId) {
    return { ok: false, error: "No project found" };
  }

  try {
    const res = await fetch(`/api/projects/${params.projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params.body),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        error: data.error || "Failed to save",
        data,
      };
    }

    return {
      ok: true,
      data,
    };
  } catch {
    return {
      ok: false,
      error: "Something went wrong",
    };
  }
}
