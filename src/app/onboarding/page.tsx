"use client";

import { validateOrgName } from "@/lib/orgs";
import {
  generateSubdomain,
  slugifyProject,
  validateGitHubRepoUrl,
  validateProjectName,
} from "@/lib/projects";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const STEPS = ["org", "github", "project", "success"] as const;

const STEP_LABELS = ["Organization", "GitHub", "Project", "Complete"];

const ONBOARDING_STATE_KEY = "onboarding-state";

type OnboardingState = {
  step: number;
  orgName: string;
  repoUrl: string;
  projectName: string;
  createdOrg: {
    id: string;
    slug: string;
  } | null;
};

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

  // Step 1 state
  const [orgName, setOrgName] = useState("");
  const [orgError, setOrgError] = useState("");
  const [orgLoading, setOrgLoading] = useState(false);
  const [createdOrg, setCreatedOrg] = useState<{
    id: string;
    slug: string;
  } | null>(null);

  // Step 2 state
  const [repoUrl, setRepoUrl] = useState("");
  const [repoError, setRepoError] = useState("");

  // Step 3 state
  const [projectName, setProjectName] = useState("");
  const [projectError, setProjectError] = useState("");
  const [projectLoading, setProjectLoading] = useState(false);
  const [createdProject, setCreatedProject] = useState<{
    id: string;
    subdomain: string;
  } | null>(null);

  // Check if user already has an org — if so, skip onboarding
  useEffect(() => {
    const persistedState = readOnboardingState();

    if (persistedState) {
      setOrgName(persistedState.orgName);
      setRepoUrl(persistedState.repoUrl);
      setProjectName(persistedState.projectName);
      setCreatedOrg(persistedState.createdOrg);
      setStep(persistedState.step);
    }

    Promise.all([
      fetch("/api/orgs").then((res) => res.json()),
      fetch("/api/projects").then((res) => res.json()),
    ])
      .then(([orgData, projectData]) => {
        const existingOrg = orgData.orgs?.[0];
        const existingProject = projectData.projects?.[0];

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

    if (!createdOrg && !orgName && !repoUrl && !projectName && step === 0) {
      clearOnboardingState();
      return;
    }

    writeOnboardingState({
      step,
      orgName,
      repoUrl,
      projectName,
      createdOrg,
    });
  }, [checking, createdOrg, orgName, projectName, repoUrl, step]);

  // ── Step 1: Create Organization ─────────────────────────────────────────────

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

  // ── Step 2: GitHub connection (skippable) ───────────────────────────────────

  const handleSkipGitHub = useCallback(() => {
    setRepoError("");
    setStep(2);
  }, []);

  const handleConnectGitHub = useCallback(() => {
    const trimmed = repoUrl.trim();
    const error = validateGitHubRepoUrl(trimmed);

    if (error) {
      setRepoError(error);
      return;
    }

    setRepoError("");
    setRepoUrl(trimmed);
    setStep(2);
  }, [repoUrl]);

  // ── Step 3: Create Project ──────────────────────────────────────────────────

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
          repoUrl: repoUrl.trim() || undefined,
          createInitialDeployment: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setProjectError(data.error || "Failed to create project");
        setProjectLoading(false);
        return;
      }
      const data = await res.json();
      setCreatedProject({
        id: data.project.id,
        subdomain: data.project.subdomain,
      });
      setStep(3);
    } catch {
      setProjectError("Something went wrong. Please try again.");
    } finally {
      setProjectLoading(false);
    }
  }, [projectName, repoUrl]);

  // ── Step 4: Success → Go to dashboard ───────────────────────────────────────

  const handleGoToDashboard = useCallback(() => {
    clearOnboardingState();
    router.push("/dashboard");
  }, [router]);

  // ── Render ──────────────────────────────────────────────────────────────────

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
        {/* Progress indicator */}
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

        {/* Step content */}
        <div className="rounded-xl border border-gray-800 bg-[#111111] p-8">
          {/* ── Step 1: Organization ──────────────────────────────────── */}
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

          {/* ── Step 2: GitHub connection ─────────────────────────────── */}
          {currentStepId === "github" && (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800">
                    <GitBranch className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h1 className="text-2xl font-semibold text-white">
                  Connect your repository
                </h1>
                <p className="text-sm text-gray-400">
                  Link a GitHub repository to sync your documentation, or skip
                  this step
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="repo-url"
                    className="block text-sm font-medium text-gray-300"
                  >
                    GitHub repository URL
                    <span className="ml-1 text-gray-500">(optional)</span>
                  </label>
                  <input
                    id="repo-url"
                    type="text"
                    value={repoUrl}
                    onChange={(e) => {
                      setRepoUrl(e.target.value);
                      setRepoError("");
                    }}
                    placeholder="https://github.com/org/repo"
                    className="w-full rounded-lg border border-gray-700 bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  {repoError && (
                    <p className="text-sm text-red-400">{repoError}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleConnectGitHub}
                  disabled={!repoUrl.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  <GitBranch className="h-4 w-4" />
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

          {/* ── Step 3: Create project ───────────────────────────────── */}
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

                {/* Subdomain preview */}
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
                      .mintlify.app
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

              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
              >
                <ChevronLeft className="h-3 w-3" />
                Back
              </button>
            </div>
          )}

          {/* ── Step 4: Success ───────────────────────────────────────── */}
          {currentStepId === "success" && (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                    <Check className="h-8 w-8 text-emerald-500" />
                  </div>
                </div>
                <h1 className="text-2xl font-semibold text-white">
                  You&apos;re all set!
                </h1>
                <p className="text-sm text-gray-400">
                  Your documentation project has been created successfully
                </p>
              </div>

              {createdProject && (
                <div className="rounded-lg border border-gray-700 bg-[#1a1a1a] px-4 py-4 text-center">
                  <p className="text-xs text-gray-500">Your docs site</p>
                  <p className="mt-1 text-sm font-medium text-emerald-400">
                    {createdProject.subdomain}.mintlify.app
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoToDashboard}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
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
