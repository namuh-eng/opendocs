"use client";

import { authClient } from "@/lib/auth-client";
import { useState } from "react";

interface GoogleAuthCardProps {
  callbackURL: string;
  mode: "login" | "signup";
}

type LoadingState = "email" | "google" | null;

function fallbackNameFromEmail(email: string) {
  const localPart = email.split("@")[0]?.trim();
  return localPart || "OpenDocs user";
}

export function GoogleAuthCard({ callbackURL, mode }: GoogleAuthCardProps) {
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

  return (
    <div className="w-full max-w-sm space-y-6 rounded-xl border border-[var(--od-border)] bg-[var(--od-panel)] p-8 shadow-[var(--od-shadow)]">
      <div className="space-y-2 text-center">
        <div className="mb-4 flex justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            style={{ color: "var(--od-accent)" }}
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
        <h1 className="text-2xl font-semibold text-[var(--od-text)]">
          {isSignup ? "Create an account" : "Sign in"}
        </h1>
        <p className="text-sm text-[var(--od-text-muted)]">
          {isSignup
            ? "Get started with your documentation platform"
            : "Sign in to your documentation dashboard"}
        </p>
      </div>

      <form className="space-y-3" onSubmit={handleEmailAuth}>
        {isSignup && (
          <label className="block space-y-1 text-sm font-medium text-[var(--od-text)]">
            <span>Name</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-lg border border-[var(--od-border)] bg-[var(--od-panel-muted)] px-3 py-2 text-[var(--od-text)] placeholder:text-[var(--od-text-subtle)] focus:border-[var(--od-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)]"
            />
          </label>
        )}

        <label className="block space-y-1 text-sm font-medium text-[var(--od-text)]">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            required
            className="w-full rounded-lg border border-[var(--od-border)] bg-[var(--od-panel-muted)] px-3 py-2 text-[var(--od-text)] placeholder:text-[var(--od-text-subtle)] focus:border-[var(--od-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)]"
          />
        </label>

        <label className="block space-y-1 text-sm font-medium text-[var(--od-text)]">
          <span>Password</span>
          <input
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            minLength={8}
            required
            className="w-full rounded-lg border border-[var(--od-border)] bg-[var(--od-panel-muted)] px-3 py-2 text-[var(--od-text)] placeholder:text-[var(--od-text-subtle)] focus:border-[var(--od-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)]"
          />
        </label>

        {error && (
          <p className="rounded-md border border-[var(--od-danger)]/40 bg-[var(--od-danger-soft)] px-3 py-2 text-sm text-[var(--od-danger)]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading !== null}
          className="flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-medium transition-[filter,background-color] hover:brightness-110 disabled:opacity-50"
          style={{
            backgroundColor: "var(--od-accent)",
            color: "#ffffff",
            boxShadow: "var(--od-publish-shadow)",
          }}
        >
          {loading === "email"
            ? "Continuing..."
            : isSignup
              ? "Continue with email"
              : "Continue with password"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-[var(--od-text-subtle)]">
        <div className="h-px flex-1 bg-[var(--od-border)]" />
        <span>or</span>
        <div className="h-px flex-1 bg-[var(--od-border)]" />
      </div>

      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={loading !== null}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-[var(--od-border)] bg-[var(--od-panel-muted)] px-4 py-3 text-sm font-medium text-[var(--od-text)] transition-colors hover:bg-[var(--od-panel-raised)] disabled:opacity-50"
      >
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
        {loading === "google" ? "Redirecting..." : "Continue with Google"}
      </button>

      <p className="text-center text-xs text-[var(--od-text-subtle)]">
        {isSignup ? "Already have an account? " : "Don't have an account? "}
        <a
          href={isSignup ? "/login" : "/signup"}
          className="text-[var(--od-accent)] hover:text-[var(--od-accent-strong)]"
        >
          {isSignup ? "Sign in" : "Sign up"}
        </a>
      </p>
    </div>
  );
}
