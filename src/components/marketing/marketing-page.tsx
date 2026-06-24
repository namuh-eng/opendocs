import Link from "next/link";
import type { ReactNode } from "react";

type MarketingPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function MarketingPage({
  eyebrow,
  title,
  description,
  children,
}: MarketingPageProps) {
  return (
    <main className="marketing-page">
      <style>{`
        .marketing-page {
          min-height: 100vh;
          background: #f7f4ed;
          color: #1f1d2c;
          font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif;
          padding: 0 24px 80px;
        }
        .marketing-page .nav {
          max-width: 1120px;
          margin: 0 auto;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .marketing-page a { color: inherit; }
        .marketing-page .wordmark {
          font-family: var(--font-display), Georgia, serif;
          font-size: 20px;
          text-decoration: none;
        }
        .marketing-page .nav-links {
          display: flex;
          align-items: center;
          gap: 20px;
          color: #6b6878;
          font-size: 14px;
        }
        .marketing-page .nav-links a { text-decoration: none; }
        .marketing-page .primary {
          color: #fff;
          background: #5466c2;
          border-radius: 999px;
          padding: 9px 16px;
          text-decoration: none;
          font-weight: 700;
        }
        .marketing-page .hero,
        .marketing-page .content {
          max-width: 1120px;
          margin: 0 auto;
        }
        .marketing-page .hero {
          padding: 88px 0 44px;
          text-align: center;
        }
        .marketing-page .eyebrow {
          display: inline-flex;
          margin-bottom: 20px;
          border: 1px solid rgba(107,127,215,0.20);
          background: #eaecf8;
          color: #5466c2;
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 700;
        }
        .marketing-page h1 {
          margin: 0 auto 18px;
          max-width: 780px;
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(44px, 7vw, 76px);
          line-height: 0.96;
          letter-spacing: -0.045em;
        }
        .marketing-page .description {
          margin: 0 auto;
          max-width: 680px;
          color: #6b6878;
          font-size: 20px;
          line-height: 1.6;
        }
        .marketing-page .grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }
        .marketing-page .card {
          background: #fff;
          border: 1px solid #e5dfd0;
          border-radius: 24px;
          padding: 26px;
          box-shadow: 0 12px 30px rgba(31,29,44,0.07);
        }
        .marketing-page .card h2,
        .marketing-page .card h3 {
          margin: 0 0 10px;
          font-family: var(--font-display), Georgia, serif;
          font-size: 28px;
          letter-spacing: -0.025em;
        }
        .marketing-page .card p,
        .marketing-page .card li { color: #6b6878; line-height: 1.65; }
        .marketing-page .card ul { padding-left: 20px; }
        .marketing-page .muted { color: #6b6878; }
        .marketing-page .wide { grid-column: 1 / -1; }
        @media (max-width: 820px) {
          .marketing-page .grid { grid-template-columns: 1fr; }
          .marketing-page .nav-links { gap: 12px; }
          .marketing-page .nav-links a:not(.primary) { display: none; }
        }
      `}</style>
      <nav className="nav" aria-label="Marketing">
        <Link href="/" className="wordmark">
          OpenDocs
        </Link>
        <div className="nav-links">
          <Link href="/docs">Docs</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/changelog">Changelog</Link>
          <Link href="/onboarding" className="primary">
            Start onboarding
          </Link>
        </div>
      </nav>
      <section className="hero">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="description">{description}</p>
      </section>
      <section className="content">{children}</section>
    </main>
  );
}
