import { MarketingPage } from "@/components/marketing/marketing-page";

export default function SecurityPage() {
  return (
    <MarketingPage
      eyebrow="Security"
      title="Security overview"
      description="OpenDocs keeps production security basics front-and-center: HTTPS, scoped app access, hardened response headers, and private dashboard surfaces."
    >
      <div className="grid">
        <article className="card wide">
          <h2>Current controls</h2>
          <ul>
            <li>HTTPS-only production traffic.</li>
            <li>Authenticated dashboard and onboarding routes.</li>
            <li>
              Security headers for content type, framing, permissions, and
              referrer policy.
            </li>
            <li>Project data scoped through server-side access checks.</li>
          </ul>
        </article>
      </div>
    </MarketingPage>
  );
}
