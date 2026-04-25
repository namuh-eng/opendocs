"use client";

import {
  ConnectedRepoSelect,
  type ConnectedRepoOption,
} from "@/components/github/connected-repo-select";
import { validateOrgName } from "@/lib/orgs";
import {
  generateSubdomain,
  slugifyProject,
  validateGitHubRepoUrl,
  validateProjectName,
} from "@/lib/projects";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const STEPS = ["org", "github", "project", "success"] as const;

const STEP_LABELS = ["Organization", "GitHub", "Project", "Complete"];

const ONBOARDING_STATE_KEY = "onboarding-state";

type OnboardingState = {
  step: number;
  orgName: string;
  repoUrl: string;
  selectedRepoFullName: string;
  projectName: string;
  createdOrg: {
    id: string;
    slug: string;
  } | null;
};

interface ProjectGitHubSource {
  repoFullName: string;
  owner: string;
  repo: string;
  installationId?: string;
  branch?: string;
  path?: string;
  sourceType: "connected_repo" | "public_repo";
}

interface ExistingProject {
  id: string;
  githubSource?: ProjectGitHubSource | null;
}

function readOnboardingState(): OnboardingState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(ONBOARDING_STATE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as OnboardingState;
  } catch {
    window.sessionStorage.removeItem(ONBOARDING_STATE_KEY);
    return null;
  }
}

function writeOnboardingState(state: OnboardingState) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(state));
}

function clearOnboardingState() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(ONBOARDING_STATE_KEY);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(true);

  const [orgName, setOrgName] = useState("");
  const [orgError, setOrgError] = useState("");
  const [orgLoading, setOrgLoading] = useState(false);
  const [createdOrg, setCreatedOrg] = useState<{
    id: string;
    slug: string;
  } | null>(null);

  const [repoUrl, setRepoUrl] = useState("");
  const [selectedRepoFullName, setSelectedRepoFullName] = useState("");
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepoOption[]>(
    [],
  );
  const [repoError, setRepoError] = useState("");
  const [repoHint, setRepoHint] = useState("");

  const [projectName, setProjectName] = useState("");
  const [projectError, setProjectError] = useState("");
  const [projectLoading, setProjectLoading] = useState(false);
  const [createdProject, setCreatedProject] = useState<{
    id: string;
    subdomain: string;
  } | null>(null);

  useEffect(() => {
    const persistedState = readOnboardingState();

    if (persistedState) {
      setOrgName(persistedState.orgName);
      setRepoUrl(persistedState.repoUrl);
      setSelectedRepoFullName(persistedState.selectedRepoFullName ?? "");
      setProjectName(persistedState.projectName);
      setCreatedOrg(persistedState.createdOrg);
      setStep(persistedState.step);
    }

    Promise.all([
      fetch("/api/orgs").then((res) => res.json()),
      fetch("/api/projects").then((res) => res.json()),
      fetch("/api/github-connections").then((res) => res.json()),
    ])
      .then(([orgData, projectData, connectionData]) => {
        const repos = (connectionData.connections ?? []).flatMap(
          (connection: { installationId: string; repos?: ConnectedRepoOption[] }) =>
            (connection.repos ?? []).map((repo) => ({
              ...repo,
              installationId: connection.installationId,
            })),
        );
        setConnectedRepos(repos);

        const existingOrg = orgData.orgs?.[0];
        const existingProject = projectData.projects?.[0] as ExistingProject | undefined;

        if (existingOrg && existingProject) {
          clearOnboardingState();
          router.replace("/dashboard");
          return;
        }

        if (existingOrg) {
          setCreatedOrg({ id: existingOrg.id, slug: existingOrg.slug });
          setOrgName(existingOrg.name);
          setStep((currentStep) => {
            const resumedStep =
              persistedState && persistedState.step >= 2 ? 2 : 1;
            return Math.max(currentStep, resumedStep);
          });
        } else if (!persistedState) {
          clearOnboardingState();
        }

        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  useEffect(() => {
    if (checking) {
      return;
    }

    if (
      !createdOrg &&
      !orgName &&
      !repoUrl &&
      !selectedRepoFullName &&
      !projectName &&
      step === 0
    ) {
      clearOnboardingState();
      return;
    }

    writeOnboardingState({
      step,
      orgName,
      repoUrl,
      selectedRepoFullName,
      projectName,
      createdOrg,
    });
  }, [
    checking,
    createdOrg,
    orgName,
    projectName,
    repoUrl,
    selectedRepoFullName,
    step,
  ]);

  const handleCreateOrg = useCallback(async () => {
    setOrgError("");
    const trimmed = orgName.trim();
    const err = validateOrgName(trimmed);
    if (err) {
      setOrgError(err);
      return;
    }

    setOrgLoading(true);
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        setOrgError(data.error || "Failed to create organization");
        setOrgLoading(false);
        return;
      }
      const data = await res.json();
      setCreatedOrg({ id: data.org.id, slug: data.org.slug });
      setStep(1);
    } catch {
      setOrgError("Something went wrong. Please try again.");
    } finally {
      setOrgLoading(false);
    }
  }, [orgName]);

  const selectedRepo = useMemo(
    () =>
      connectedRepos.find(
        (repo) => repo.fullName.toLowerCase() === selectedRepoFullName.toLowerCase(),
      ) ?? null,
    [connectedRepos, selectedRepoFullName],
  );

  const resolvedRepoUrl = useMemo(() => {
    if (selectedRepoFullName) {
      return `https://github.com/${selectedRepoFullName}`;
    }

    return repoUrl;
  }, [repoUrl, selectedRepoFullName]);

  const parsedRepo = useMemo(() => {
    const trimmed = resolvedRepoUrl.trim().toLowerCase();
    if (!trimmed) return null;
    return trimmed;
  }, [resolvedRepoUrl]);

  const looksPrivateRepo = Boolean(
    parsedRepo &&
      (parsedRepo.includes("/private") ||
        parsedRepo.includes("?private=") ||
        parsedRepo.includes("#private")),
  );

  const handleSkipGitHub = useCallback(() => {
    setRepoError("");
    setRepoHint("");
    setStep(2);
  }, []);

  const handleConnectGitHub = useCallback(() => {
    const trimmed = resolvedRepoUrl.trim();
    const error = validateGitHubRepoUrl(trimmed);

    if (error) {
      setRepoError(error);
      setRepoHint("");
      return;
    }

    setRepoError("");
    if (!selectedRepoFullName) {
      setRepoUrl(trimmed);
    }
    if (looksPrivateRepo) {
      setRepoHint(
        "Private repos need a verified GitHub connection before import. You can continue, but project creation will block until GitHub is connected.",
      );
    } else {
      setRepoHint(
        "Public repos can be linked without a GitHub connection. We will create starter docs now, and verified GitHub sync can be connected later.",
      );
    }
    setStep(2);
  }, [looksPrivateRepo, resolvedRepoUrl, selectedRepoFullName]);

  const handleCreateProject = useCallback(async () => {
    setProjectError("");
    const trimmed = projectName.trim();
    const err = validateProjectName(trimmed);
    if (err) {
      setProjectError(err);
      return;
    }

    setProjectLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          repoUrl: resolvedRepoUrl.trim() || undefined,
          githubInstallationId: selectedRepo?.installationId,
          createInitialDeployment: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setProjectError(data.error || "Failed to create project");
        if (data.githubImportAccess?.status === "repo_not_connected") {
          setStep(1);
          setRepoHint(
            "GitHub connection is required before importing docs from that repository.",
          );
        }
        setProjectLoading(false);
        return;
      }
      const data = await res.json();
      setCreatedProject({
        id: data.project.id,
        subdomain: data.project.subdomain,
      });

      const provisionRes = await fetch("/api/onboarding/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: data.project.id }),
      });

      const provisionData = await provisionRes.json().catch(() => null);

      if (!provisionRes.ok) {
        setProjectError(
          provisionData?.error || "Failed to provision initial content",
        );
        if (provisionData?.githubImportAccess?.status === "repo_not_connected") {
          setStep(1);
          setRepoHint(
            "GitHub connection is required before importing docs from that repository.",
          );
        }
        return;
      }

      if (provisionData?.provisioning?.source === "public") {
        setRepoHint(
          provisionData.provisioning.message ||
            "Starter docs were created during onboarding. Verified GitHub import has not run yet.",
        );
      }

      setStep(3);
    } catch {
      setProjectError("Something went wrong. Please try again.");
    } finally {
      setProjectLoading(false);
    }
  }, [projectName, resolvedRepoUrl, selectedRepo]);

  const handleGoToDashboard = useCallback(() => {
    clearOnboardingState();
    router.push("/dashboard");
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const currentStepId = STEPS[step];

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="flex items-center justify-center gap-2">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors ${
                    i < step
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : i === step
                        ? "border-emerald-500 text-emerald-500"
                        : "border-gray-700 text-gray-500"
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={`mt-1 text-[10px] ${
                    i <= step ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`mb-4 h-0.5 w-8 ${
                    i < step ? "bg-emerald-500" : "bg-gray-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#111111] p-8">
          {currentStepId === "org" && (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <div className="mb-4 flex justify-center">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    className="text-emerald-500"
                  >
                    <title>Logo</title>
                    <rect width="32" height="32" rx="8" fill="currentColor" />
                    <path
                      d="M8 16L14 22L24 10"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-semibold text-white">
                  Create your organization
                </h1>
                <p className="text-sm text-gray-400">
                  Set up your team to start building documentation
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="org-name"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Organization name
                  </label>
                  <input
                    id="org-name"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateOrg();
                    }}
                    placeholder="e.g. Acme Inc"
                    className="w-full rounded-lg border border-gray-700 bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  {orgError && (
                    <p className="text-sm text-red-400">{orgError}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCreateOrg}
                  disabled={orgLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  {orgLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {currentStepId === "github" && (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-sm font-semibold text-white">
                    GH
                  </div>
                </div>
                <h1 className="text-2xl font-semibold text-white">
                  Connect your repository
                </h1>
                <p className="text-sm text-gray-400">
                  Link a GitHub repository for source context. Private repos
                  require a verified GitHub connection. Public repos can be
                  linked without auth, but onboarding still starts from starter
                  docs until verified sync/import is available.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <ConnectedRepoSelect
                    repos={connectedRepos}
                    value={selectedRepoFullName}
                    onChange={(value) => {
                      setSelectedRepoFullName(value);
                      if (value) {
                        setRepoUrl("");
                      }
                      setRepoError("");
                      setRepoHint("");
                    }}
                    allowPublicUrl
                    publicUrlValue={repoUrl}
                    onPublicUrlChange={(value) => {
                      setRepoUrl(value);
                      if (value.trim()) {
                        setSelectedRepoFullName("");
                      }
                      setRepoError("");
                      setRepoHint("");
                    }}
                  />
                  {repoError && (
                    <p className="text-sm text-red-400">{repoError}</p>
                  )}
                  {repoHint && (
                    <p className="text-sm text-amber-300">{repoHint}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleConnectGitHub}
                  disabled={!resolvedRepoUrl.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  Connect repository
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-700" />
                  <span className="text-xs text-gray-500">or</span>
                  <div className="h-px flex-1 bg-gray-700" />
                </div>

                <button
                  type="button"
                  onClick={handleSkipGitHub}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:text-white"
                >
                  Skip for now
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
              >
                <ChevronLeft className="h-3 w-3" />
                Back
              </button>
            </div>
          )}

          {currentStepId === "project" && (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <h1 className="text-2xl font-semibold text-white">
                  Create your first project
                </h1>
                <p className="text-sm text-gray-400">
                  Give your documentation project a name
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="project-name"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Project name
                  </label>
                  <input
                    id="project-name"
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateProject();
                    }}
                    placeholder="e.g. API Docs"
                    className="w-full rounded-lg border border-gray-700 bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  {projectError && (
                    <p className="text-sm text-red-400">{projectError}</p>
                  )}
                </div>

                {projectName.trim() && createdOrg && (
                  <div className="rounded-lg border border-gray-700 bg-[#1a1a1a] px-4 py-3">
                    <p className="text-xs text-gray-500">
                      Your docs will be available at:
                    </p>
                    <p className="mt-1 text-sm text-emerald-400">
                      {generateSubdomain(
                        createdOrg.slug,
                        slugifyProject(projectName.trim()),
                      )}
                      .namuh.dev
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCreateProject}
                  disabled={projectLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  {projectLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Create project
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {currentStepId === "success" && createdProject && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <Check className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-white">All set</h1>
                <p className="text-sm text-gray-400">
                  Your docs project is ready at
                </p>
                <p className="text-sm text-emerald-400">
                  {createdProject.subdomain}.namuh.dev
                </p>
              </div>
              <button
                type="button"
                onClick={handleGoToDashboard}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
              >
                Go to dashboard
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
