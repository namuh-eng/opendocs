import { MarketingPage } from "@/components/marketing/marketing-page";

const updates = [
  {
    title: "Public beta hardening",
    date: "June 2026",
    body: "Improved production docs routing, dashboard polish, deployment previews, and public landing-page QA coverage.",
  },
  {
    title: "AI-native docs workflows",
    date: "May 2026",
    body: "Added assistant surfaces, source-cited answers, semantic search, and analytics views for reader intent.",
  },
  {
    title: "Authoring and API foundations",
    date: "April 2026",
    body: "Shipped MDX rendering, API reference support, GitHub-backed project setup, and custom domain configuration.",
  },
];

export default function ChangelogPage() {
  return (
    <MarketingPage
      eyebrow="Changelog"
      title="What’s new in OpenDocs"
      description="A lightweight public changelog for the product improvements, QA passes, and roadmap work that keep OpenDocs moving toward Mintlify-grade polish."
    >
      <div className="grid">
        {updates.map((update) => (
          <article className="card" key={update.title}>
            <p className="muted" style={{ marginTop: 0 }}>
              {update.date}
            </p>
            <h2>{update.title}</h2>
            <p>{update.body}</p>
          </article>
        ))}
        <article className="card wide" id="roadmap">
          <h2>Roadmap</h2>
          <p>
            Next up: stronger customer proof, richer pricing detail, public
            status signals, and deeper docs-site parity checks against the best
            Mintlify surfaces.
          </p>
        </article>
        <article className="card wide" id="status">
          <h2>Status</h2>
          <p>
            OpenDocs production is online. For urgent issues, sign in and use
            the dashboard support path while a dedicated public status page is
            prepared.
          </p>
        </article>
      </div>
    </MarketingPage>
  );
}
