"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

interface AuthScreenProps {
  callbackURL: string;
  mode: "login" | "signup";
}

// Google OAuth is the only auth method we offer right now. The GitHub/SSO
// buttons, email/password form, and magic-link line are kept in the markup
// below but hidden behind this flag — flip to true to bring them back.
const SHOW_ALTERNATE_AUTH = false;

type LoadingState = "email" | "google" | null;

function fallbackNameFromEmail(email: string) {
  const localPart = email.split("@")[0]?.trim();
  return localPart || "OpenDocs user";
}

function LogoTile({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      style={{ color: "var(--od-accent)" }}
    >
      <title>OpenDocs</title>
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M8 16L14 22L24 10"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <title>Google</title>
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
      <title>GitHub</title>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function SsoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <title>SSO</title>
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#e5dfd0] bg-white px-3.5 py-2.5 text-[15px] text-[#1f1d2c] placeholder:text-[#948f9e] focus:border-[var(--od-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)]";

const labelClass = "text-sm font-medium text-[#1f1d2c]";

export function AuthScreen({ callbackURL, mode }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState<LoadingState>(null);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  const handleGoogleAuth = async () => {
    setLoading("google");
    setError(null);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });

      if (result.error) {
        setError(result.error.message || "Google sign-in failed.");
        setLoading(null);
      }
    } catch {
      setError("Google sign-in failed. Please try again.");
      setLoading(null);
    }
  };

  const handleEmailAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading("email");
    setError(null);

    try {
      const result = isSignup
        ? await authClient.signUp.email({
            email,
            password,
            name: name.trim() || fallbackNameFromEmail(email),
            callbackURL,
          })
        : await authClient.signIn.email({
            email,
            password,
            callbackURL,
          });

      if (result.error) {
        setError(result.error.message || "Email authentication failed.");
        setLoading(null);
        return;
      }

      window.location.assign(callbackURL);
    } catch {
      setError("Email authentication failed. Please try again.");
      setLoading(null);
    }
  };

  const comingSoon = (feature: string) => {
    setError(`${feature} is coming soon — use Google or email for now.`);
  };

  return (
    <div className="flex min-h-screen">
      {/* ── Left ink panel ── */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#14121f] p-10 text-[#f4f1e6] lg:flex">
        {/* Decorative concentric circles */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-[-120px]"
        >
          {[420, 300, 180].map((d) => (
            <div
              key={d}
              className="absolute rounded-full border border-[#f4f1e6]/[0.05]"
              style={{
                width: d,
                height: d,
                top: 220 - d / 2,
                right: 220 - d / 2,
              }}
            />
          ))}
        </div>

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoTile size={28} />
            <span className="text-[17px] font-semibold tracking-tight">
              open
              <span className="[font-family:var(--font-display)] italic font-normal text-[#a8b3ea]">
                docs
              </span>
            </span>
          </div>
          <span className="text-sm text-[#a8a3b8]">
            {isSignup ? "Free · No credit card" : "Welcome back"}
          </span>
        </div>

        <div className="relative max-w-[620px]">
          <div className="mb-6 text-3xl leading-none text-[var(--od-accent)] [font-family:var(--font-display)]">
            &ldquo;
          </div>
          <p className="[font-family:var(--font-display)] text-[clamp(36px,3.4vw,56px)] leading-[1.12] tracking-[-0.01em]">
            {isSignup ? (
              <>
                An AI-native docs platform —{" "}
                <em className="text-[#8b9ae8]">
                  on infrastructure you control.
                </em>
              </>
            ) : (
              <>
                Docs you ship like product.{" "}
                <em className="text-[#8b9ae8]">Self-hostable. Open source.</em>
              </>
            )}
          </p>

          <div className="mt-10 flex items-center gap-3.5">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white ${
                isSignup ? "bg-[var(--od-accent)]" : "bg-[#c97455]"
              }`}
            >
              {isSignup ? "OS" : "AH"}
            </span>
            <span>
              <span className="block text-[15px] font-semibold">
                {isSignup ? "Open source" : "Ashley Ha & Jaeyun Ha"}
              </span>
              <span className="block text-sm text-[#a8a3b8]">
                {isSignup
                  ? "MIT · Self-hostable on AWS"
                  : "Creators · namuh-eng/opendocs"}
              </span>
            </span>
          </div>
        </div>

        <div className="relative border-t border-[#f4f1e6]/10 pt-5 text-[13px] text-[#a8a3b8]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="flex items-center gap-1.5">
              <span className="text-[#d9b35e]">★</span>
              <span className="font-semibold text-[#f4f1e6]">Star</span>
              <a
                href="https://github.com/namuh-eng/opendocs"
                className="text-[#8b9ae8] hover:text-[#a8b3ea]"
              >
                on GitHub
              </a>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[#6f6b80]">●</span> Production at
              opendocs.namuh.co
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[#6f6b80]">●</span> AWS Bedrock · Better
              Auth
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[#6f6b80]">●</span> Elastic License 2.0
            </span>
          </div>
        </div>
      </aside>

      {/* ── Right cream panel ── */}
      <main className="relative flex w-full flex-col bg-[#f7f4ed] lg:w-1/2">
        <div className="flex items-center justify-end gap-2 px-8 pt-7 text-sm">
          <span className="text-[#6b6878]">
            {isSignup ? "Already have an account?" : "Don't have an account?"}
          </span>
          <a
            href={isSignup ? "/login" : "/signup"}
            className="font-semibold text-[var(--od-accent-text)] hover:text-[var(--od-accent-strong)]"
          >
            {isSignup ? "Log in →" : "Sign up →"}
          </a>
        </div>

        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-8 py-12">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaecf8]">
            <LogoTile size={30} />
          </div>

          <h1 className="[font-family:var(--font-display)] text-[clamp(30px,2.6vw,38px)] leading-tight tracking-[-0.01em] text-[#1f1d2c]">
            {isSignup ? (
              <>
                Make your docs{" "}
                <em className="text-[var(--od-accent)]">matter.</em>
              </>
            ) : (
              <>
                Welcome <em className="text-[var(--od-accent)]">back.</em>
              </>
            )}
          </h1>
          <p className="mt-2 text-[15px] text-[#6b6878]">
            {isSignup
              ? "Start a free workspace. No credit card required."
              : "Pick up where you left off."}
          </p>

          <div className="mt-7 space-y-2.5">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading !== null}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#e5dfd0] bg-white px-4 py-3 text-[15px] font-medium text-[#1f1d2c] transition-colors hover:bg-[#faf6ec] disabled:opacity-50"
            >
              <GoogleIcon />
              {loading === "google" ? "Redirecting..." : "Continue with Google"}
            </button>
            {SHOW_ALTERNATE_AUTH && (
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => comingSoon("GitHub sign-in")}
                  disabled={loading !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#e5dfd0] bg-white px-4 py-2.5 text-sm font-medium text-[#1f1d2c] transition-colors hover:bg-[#faf6ec] disabled:opacity-50"
                >
                  <GitHubIcon />
                  GitHub
                </button>
                <button
                  type="button"
                  onClick={() => comingSoon("SSO")}
                  disabled={loading !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#e5dfd0] bg-white px-4 py-2.5 text-sm font-medium text-[#1f1d2c] transition-colors hover:bg-[#faf6ec] disabled:opacity-50"
                >
                  <SsoIcon />
                  SSO
                </button>
              </div>
            )}
          </div>

          {!SHOW_ALTERNATE_AUTH && error && (
            <p className="mt-5 rounded-lg border border-[var(--od-danger)]/40 bg-[var(--od-danger-soft)] px-3 py-2 text-sm text-[var(--od-danger)]">
              {error}
            </p>
          )}

          {SHOW_ALTERNATE_AUTH && (
            <>
              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-[#e5dfd0]" />
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#948f9e]">
                  Or with email
                </span>
                <div className="h-px flex-1 bg-[#e5dfd0]" />
              </div>

              <form className="space-y-4" onSubmit={handleEmailAuth}>
                {isSignup && (
                  <label className="block space-y-1.5">
                    <span className={labelClass}>Name</span>
                    <input
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your name"
                      className={inputClass}
                    />
                  </label>
                )}

                <label className="block space-y-1.5">
                  <span className={labelClass}>Work email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    required
                    className={inputClass}
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="flex items-baseline justify-between">
                    <span className={labelClass}>Password</span>
                    {isSignup ? (
                      <span className="text-xs text-[#948f9e]">
                        Min. 8 characters
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => comingSoon("Password reset")}
                        className="text-xs font-medium text-[var(--od-accent-text)] hover:text-[var(--od-accent-strong)]"
                      >
                        Forgot?
                      </button>
                    )}
                  </span>
                  <input
                    type="password"
                    autoComplete={
                      isSignup ? "new-password" : "current-password"
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    minLength={8}
                    required
                    className={inputClass}
                  />
                </label>

                {isSignup && (
                  <label className="flex items-start gap-2.5 text-sm text-[#6b6878]">
                    <input
                      type="checkbox"
                      defaultChecked
                      required
                      className="mt-0.5 h-4 w-4 rounded border-[#e5dfd0] accent-[var(--od-accent)]"
                    />
                    <span>
                      I agree to the{" "}
                      <a
                        href="/"
                        className="text-[var(--od-accent-text)] hover:text-[var(--od-accent-strong)]"
                      >
                        Terms
                      </a>{" "}
                      and{" "}
                      <a
                        href="/"
                        className="text-[var(--od-accent-text)] hover:text-[var(--od-accent-strong)]"
                      >
                        Privacy Policy
                      </a>
                      . Send me product updates occasionally.
                    </span>
                  </label>
                )}

                {error && (
                  <p className="rounded-lg border border-[var(--od-danger)]/40 bg-[var(--od-danger-soft)] px-3 py-2 text-sm text-[var(--od-danger)]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading !== null}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a1827] px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#221f33] disabled:opacity-50"
                >
                  {loading === "email"
                    ? "Continuing..."
                    : isSignup
                      ? "Create workspace →"
                      : "Continue →"}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-[#6b6878]">
                <span className="text-[var(--od-accent)]">✦</span> Or get a{" "}
                <button
                  type="button"
                  onClick={() => comingSoon("Magic link sign-in")}
                  className="font-medium text-[var(--od-accent-text)] hover:text-[var(--od-accent-strong)]"
                >
                  magic link
                </button>{" "}
                sent to your email
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
