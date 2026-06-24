import { MarketingPage } from "@/components/marketing/marketing-page";

export default function PrivacyPage() {
  return (
    <MarketingPage
      eyebrow="Privacy"
      title="Privacy overview"
      description="OpenDocs is designed to keep documentation projects, reader analytics, and account data scoped to the teams that own them."
    >
      <div className="grid">
        <article className="card wide">
          <h2>Data handling</h2>
          <p>
            We collect only the product data needed to operate docs projects,
            authentication, analytics, deployments, and support workflows. A
            fuller legal policy will replace this overview before general
            availability.
          </p>
        </article>
      </div>
    </MarketingPage>
  );
}
