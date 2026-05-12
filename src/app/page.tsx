import { getServerSession } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

const links = [
  {
    href: "/login",
    label: "Log in",
    style:
      "border border-[var(--od-border)] bg-[var(--od-panel)] text-[var(--od-text)] hover:bg-[var(--od-panel-muted)]",
  },
  {
    href: "/onboarding",
    label: "Start onboarding",
    style:
      "bg-[var(--od-accent)] text-[#fff] hover:bg-[var(--od-accent-strong)]",
  },
  {
    href: "/dashboard",
    label: "Open dashboard",
    style:
      "border border-[var(--od-accent-border)] bg-[var(--od-accent-soft)] text-[var(--od-accent-text)] hover:bg-[var(--od-panel-muted)]",
  },
];

export default async function Home() {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="od-app-shell min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20">
        <div className="max-w-3xl">
          <div className="od-chip mb-6">OpenDocs</div>

          <h1 className="text-4xl font-semibold text-[var(--od-text)] sm:text-6xl">
            Documentation that ships with your product
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--od-text-muted)] sm:text-lg">
            Build docs, publish API references, deploy preview environments, and
            give your team an AI-native workflow for maintaining knowledge at
            production speed.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${link.style}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          <section className="od-card p-5">
            <h2 className="text-sm font-medium text-[var(--od-text)]">
              Docs and API publishing
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--od-text-muted)]">
              Author MDX docs, generate API references, and publish a docs site
              with navigation, search, and structured content blocks.
            </p>
          </section>

          <section className="od-card p-5">
            <h2 className="text-sm font-medium text-[var(--od-text)]">
              Deployment workflow
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--od-text-muted)]">
              Track production and preview deployments, inspect branches, and
              manage documentation changes from a single dashboard.
            </p>
          </section>

          <section className="od-card p-5">
            <h2 className="text-sm font-medium text-[var(--od-text)]">
              AI-native team ops
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--od-text-muted)]">
              Layer in assistant experiences, analytics, collaboration, and
              operational settings without leaving the product surface.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
