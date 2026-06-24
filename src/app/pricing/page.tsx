import Link from "next/link";
import { MarketingPage } from "@/components/marketing/marketing-page";

const plans = [
  {
    name: "Starter",
    price: "$0",
    copy: "Launch a public docs site, connect a repo, and preview your first docs workflow.",
    features: [
      "1 project",
      "MDX authoring",
      "Public docs",
      "Community support",
    ],
  },
  {
    name: "Growth",
    price: "$49",
    copy: "For teams publishing API references, previews, and AI-assisted documentation.",
    features: [
      "Unlimited projects",
      "Custom domains",
      "Ask-AI assistant",
      "Analytics",
    ],
  },
  {
    name: "Scale",
    price: "Custom",
    copy: "Security, support, and workflow controls for larger documentation teams.",
    features: [
      "SSO-ready",
      "Advanced permissions",
      "Priority support",
      "Custom onboarding",
    ],
  },
];

export default function PricingPage() {
  return (
    <MarketingPage
      eyebrow="Pricing"
      title="Pricing that scales with your docs"
      description="Start free, prove the workflow, then add the AI, analytics, and governance your documentation team needs."
    >
      <div className="grid">
        {plans.map((plan) => (
          <article className="card" key={plan.name}>
            <h2>{plan.name}</h2>
            <p className="muted">{plan.copy}</p>
            <p style={{ fontSize: 36, fontWeight: 800, margin: "18px 0" }}>
              {plan.price}
              {plan.price.startsWith("$") ? (
                <span style={{ fontSize: 15, color: "#6b6878" }}>/month</span>
              ) : null}
            </p>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <Link className="primary" href="/onboarding">
              Get started
            </Link>
          </article>
        ))}
      </div>
    </MarketingPage>
  );
}
