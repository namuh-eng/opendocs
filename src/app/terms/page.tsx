import { MarketingPage } from "@/components/marketing/marketing-page";

export default function TermsPage() {
  return (
    <MarketingPage
      eyebrow="Terms"
      title="Terms overview"
      description="OpenDocs is currently in public beta, with product terms focused on safe evaluation and responsible use."
    >
      <div className="grid">
        <article className="card wide">
          <h2>Beta use</h2>
          <p>
            Use OpenDocs to evaluate documentation workflows, publish owned
            content, and test integrations responsibly. A fuller terms page will
            replace this overview before general availability.
          </p>
        </article>
      </div>
    </MarketingPage>
  );
}
