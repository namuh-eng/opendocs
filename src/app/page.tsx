import { getServerSession } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

const links = [
  {
    href: "/login",
    label: "Log in",
    style: "border border-white/10 bg-white/5 text-white hover:bg-white/10",
  },
  {
    href: "/onboarding",
    label: "Start onboarding",
    style: "bg-emerald-500 text-black hover:bg-emerald-400",
  },
  {
    href: "/dashboard",
    label: "Open dashboard",
    style:
      "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15",
  },
];

export default async function Home() {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/70">
            OpenDocs
          </div>

          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            Documentation that ships with your product
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
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
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-sm font-medium text-white">
              Docs and API publishing
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Author MDX docs, generate API references, and publish a docs site
              with navigation, search, and structured content blocks.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-sm font-medium text-white">
              Deployment workflow
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Track production and preview deployments, inspect branches, and
              manage documentation changes from a single dashboard.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-sm font-medium text-white">
              AI-native team ops
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Layer in assistant experiences, analytics, collaboration, and
              operational settings without leaving the product surface.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
