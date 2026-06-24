import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpenDocs design.md",
  description:
    "The OpenDocs product design principles, interface tokens, and craft notes for AI-native documentation.",
};

const notes = [
  {
    title: "Documentation is product interface",
    date: "June 24, 2026",
    minutes: "7 min read",
    excerpt:
      "Docs are no longer static collateral. They are the interface agents, developers, and customers use to understand your system.",
  },
  {
    title: "Readers arrive with intent",
    date: "June 18, 2026",
    minutes: "5 min read",
    excerpt:
      "Every surface should make next steps obvious: search, copy, ask, export, connect, or publish.",
  },
  {
    title: "Authoring should feel calm",
    date: "June 12, 2026",
    minutes: "6 min read",
    excerpt:
      "OpenDocs keeps the editor warm, spacious, and focused so teams can turn product knowledge into durable public pages.",
  },
  {
    title: "AI features need receipts",
    date: "June 5, 2026",
    minutes: "4 min read",
    excerpt:
      "Assistant answers, generated pages, and suggestions should show citations, status, and reversible controls.",
  },
  {
    title: "Enterprise polish is restraint",
    date: "May 29, 2026",
    minutes: "5 min read",
    excerpt:
      "The best docs tools feel fast, trustworthy, and almost quiet. Motion, color, and chrome support the work instead of competing with it.",
  },
  {
    title: "Mintlify-grade, OpenDocs-native",
    date: "May 21, 2026",
    minutes: "6 min read",
    excerpt:
      "We match the clarity users expect from modern docs platforms while keeping OpenDocs distinct: agent-aware, warm, and operationally transparent.",
  },
];

const principles = [
  "Make the document feel like the source of truth, not a CMS preview.",
  "Lead with clean product states. Never expose implementation or environment details to customers.",
  "Prefer warm paper, focused typography, and one useful accent over heavy chrome.",
  "Every AI surface must cite its source, reveal its confidence, and keep the human in control.",
];

const tokens = [
  ["Background", "#F7F4ED", "warm paper"],
  ["Panel", "#FFFFFF", "reader surface"],
  ["Ink", "#1F1D2C", "primary copy"],
  ["Muted", "#6B6878", "secondary text"],
  ["Accent", "#6B7FD7", "actions + focus"],
  ["Sage", "#8B9D7C", "success + natural cues"],
];

export default function DesignMdPage() {
  const activeNote = notes[0];

  return (
    <main className="design-md-page" aria-labelledby="design-md-title">
      <style>{`
        .design-md-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 18% 12%, rgba(107,127,215,0.10), transparent 28%),
            radial-gradient(circle at 80% 6%, rgba(201,116,85,0.10), transparent 24%),
            #f7f4ed;
          color: #1f1d2c;
          font-family: var(--font-body), Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          padding: 52px clamp(18px, 4vw, 56px);
        }

        .design-md-shell {
          width: min(1680px, 100%);
          min-height: min(760px, calc(100vh - 104px));
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(288px, 420px) minmax(0, 1fr);
          overflow: hidden;
          border: 1px solid rgba(31,29,44,0.14);
          border-radius: 24px;
          background: rgba(255,255,255,0.72);
          box-shadow:
            0 34px 84px rgba(31,29,44,0.18),
            0 10px 28px rgba(31,29,44,0.10),
            inset 0 1px 0 rgba(255,255,255,0.74);
          backdrop-filter: blur(18px);
        }

        .design-md-sidebar {
          display: flex;
          flex-direction: column;
          min-height: 0;
          background: rgba(250,246,236,0.92);
          border-right: 1px solid #e5dfd0;
        }

        .design-md-sidebar-header {
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 0 24px;
          border-bottom: 1px solid #e5dfd0;
        }

        .design-md-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #1f1d2c;
          font-weight: 700;
          letter-spacing: -0.02em;
          text-decoration: none;
        }

        .design-md-mark {
          position: relative;
          width: 24px;
          height: 24px;
          border-radius: 8px;
          background: linear-gradient(135deg, #6b7fd7 0%, #8b9d7c 52%, #f7f4ed 53%);
          box-shadow: inset 0 0 0 1px rgba(31,29,44,0.08);
        }

        .design-md-mark::after {
          position: absolute;
          inset: 7px 5px 5px 8px;
          content: "";
          border-radius: 999px 999px 999px 3px;
          background: #ffffff;
          transform: rotate(34deg);
        }

        .design-md-count {
          color: #948f9e;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .design-md-list {
          overflow: auto;
          padding: 0;
        }

        .design-md-note {
          position: relative;
          display: block;
          padding: 24px 24px 22px;
          border-bottom: 1px solid rgba(229,223,208,0.84);
          color: inherit;
          text-decoration: none;
          transition: background 160ms ease, color 160ms ease;
        }

        .design-md-note:hover,
        .design-md-note:focus-visible {
          background: rgba(255,255,255,0.64);
          outline: none;
        }

        .design-md-note-active {
          background: rgba(255,255,255,0.76);
        }

        .design-md-note-active::before {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 3px;
          content: "";
          background: linear-gradient(#6b7fd7, #8b9d7c);
        }

        .design-md-note-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
        }

        .design-md-note h2 {
          margin: 0;
          max-width: 260px;
          overflow: hidden;
          color: #1f1d2c;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.35;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .design-md-note-active h2 {
          color: #4b5fb7;
        }

        .design-md-note time {
          flex: 0 0 auto;
          color: #948f9e;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 12px;
        }

        .design-md-note p {
          margin: 10px 0 14px;
          display: -webkit-box;
          overflow: hidden;
          color: #5f5b6c;
          font-size: 14px;
          line-height: 1.55;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .design-md-read-time {
          color: #6b6878;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .design-md-footer {
          margin-top: auto;
          padding: 14px 24px 20px;
          color: #948f9e;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 12px;
        }

        .design-md-content {
          min-width: 0;
          overflow: auto;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.84), rgba(255,255,255,0.96)),
            #fff;
        }

        .design-md-article {
          width: min(760px, calc(100% - 96px));
          margin: 0 auto;
          padding: clamp(72px, 10vh, 116px) 0 120px;
        }

        .design-md-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #6b6878;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 13px;
        }

        .design-md-dot {
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: #c5c0b4;
        }

        .design-md-article h1 {
          margin: 28px 0 24px;
          max-width: 680px;
          color: #11101a;
          font-size: clamp(42px, 5vw, 66px);
          font-weight: 760;
          letter-spacing: -0.055em;
          line-height: 0.98;
          text-wrap: balance;
        }

        .design-md-deck {
          margin: 0;
          max-width: 720px;
          color: #4e4a5d;
          font-size: clamp(20px, 2.2vw, 28px);
          letter-spacing: -0.025em;
          line-height: 1.42;
        }

        .design-md-rule {
          height: 1px;
          margin: 48px 0;
          background: #e9e3d7;
        }

        .design-md-copy {
          color: #3c3a4d;
          font-size: 19px;
          line-height: 1.78;
        }

        .design-md-copy p {
          margin: 0 0 30px;
        }

        .design-md-copy strong {
          color: #1f1d2c;
          font-weight: 700;
        }

        .design-md-principles {
          display: grid;
          gap: 14px;
          margin: 42px 0;
          padding: 0;
          list-style: none;
        }

        .design-md-principles li {
          border: 1px solid #e5dfd0;
          border-radius: 18px;
          background: #faf6ec;
          padding: 18px 20px;
          color: #343142;
          font-size: 16px;
          line-height: 1.6;
        }

        .design-md-section-title {
          margin: 52px 0 18px;
          color: #1f1d2c;
          font-size: 28px;
          font-weight: 740;
          letter-spacing: -0.04em;
        }

        .design-md-token-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin: 28px 0 36px;
        }

        .design-md-token {
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 14px;
          align-items: center;
          border: 1px solid #e5dfd0;
          border-radius: 16px;
          background: #fff;
          padding: 14px;
        }

        .design-md-swatch {
          width: 42px;
          height: 42px;
          border: 1px solid rgba(31,29,44,0.10);
          border-radius: 12px;
        }

        .design-md-token b {
          display: block;
          color: #1f1d2c;
          font-size: 13px;
        }

        .design-md-token code {
          color: #6b6878;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 12px;
        }

        .design-md-token span {
          display: block;
          margin-top: 3px;
          color: #948f9e;
          font-size: 12px;
        }

        .design-md-empty-state {
          display: grid;
          place-items: center;
          min-height: 220px;
          margin-top: 44px;
          border: 1px dashed #ddd6c7;
          border-radius: 22px;
          background: #fbf8f1;
          text-align: center;
        }

        .design-md-empty-state p {
          margin: 0;
          color: #6b6878;
          font-size: 15px;
          line-height: 1.6;
        }

        .design-md-mini-mark {
          width: 30px;
          height: 30px;
          margin: 0 auto 14px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6b7fd7, #8b9d7c 58%, #f7f4ed 59%);
          box-shadow: inset 0 0 0 1px rgba(31,29,44,0.08);
        }

        .design-md-kicker {
          margin: 0 0 6px;
          color: #4b5fb7;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        @media (max-width: 900px) {
          .design-md-page {
            padding: 16px;
          }

          .design-md-shell {
            min-height: auto;
            grid-template-columns: 1fr;
            border-radius: 20px;
          }

          .design-md-sidebar {
            border-right: 0;
            border-bottom: 1px solid #e5dfd0;
          }

          .design-md-list {
            display: grid;
            grid-auto-columns: minmax(260px, 72vw);
            grid-auto-flow: column;
            overflow-x: auto;
          }

          .design-md-note {
            border-right: 1px solid rgba(229,223,208,0.84);
            border-bottom: 0;
          }

          .design-md-footer {
            display: none;
          }

          .design-md-article {
            width: min(100% - 40px, 760px);
            padding: 52px 0 72px;
          }

          .design-md-token-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section className="design-md-shell" aria-label="OpenDocs design notes">
        <aside className="design-md-sidebar" aria-label="Design note list">
          <div className="design-md-sidebar-header">
            <a className="design-md-brand" href="/" aria-label="OpenDocs home">
              <span className="design-md-mark" aria-hidden="true" />
              OpenDocs
            </a>
            <span className="design-md-count">{notes.length} notes</span>
          </div>

          <nav className="design-md-list" aria-label="Design notes">
            {notes.map((note, index) => (
              <a
                className={`design-md-note${index === 0 ? " design-md-note-active" : ""}`}
                href={index === 0 ? "#design-md-title" : "#principles"}
                key={note.title}
              >
                <div className="design-md-note-row">
                  <h2>{note.title}</h2>
                  <time dateTime="2026-06-24">
                    {note.date.replace(", 2026", "")}
                  </time>
                </div>
                <p>{note.excerpt}</p>
                <span className="design-md-read-time">{note.minutes}</span>
              </a>
            ))}
          </nav>

          <div className="design-md-footer">© 2026 OpenDocs</div>
        </aside>

        <article className="design-md-content">
          <div className="design-md-article">
            <div className="design-md-meta">
              <time dateTime="2026-06-24">{activeNote.date}</time>
              <span className="design-md-dot" aria-hidden="true" />
              <span>{activeNote.minutes}</span>
            </div>

            <h1 id="design-md-title">
              OpenDocs design principles for agent-native docs
            </h1>
            <p className="design-md-deck">
              OpenDocs is built for teams whose documentation is read by people,
              searched by developers, and consumed by coding agents. The product
              should feel calm, precise, and trustworthy at every step.
            </p>

            <div className="design-md-rule" />

            <div className="design-md-copy">
              <p>
                Great documentation products do not start with markdown. They
                start with <strong>orientation</strong>: where am I, what is the
                source of truth, and what can I safely do next? OpenDocs treats
                each page as a working interface, not a file viewer.
              </p>
              <p>
                The visual system is intentionally warm and restrained. Paper
                tones make long sessions comfortable. Dense controls recede
                until they are needed. The blue-violet accent is reserved for
                focus, intent, and primary action so users can move quickly
                without feeling pushed.
              </p>
              <p>
                AI features follow the same rule: useful, cited, and reversible.
                An answer without sources is decoration. A generated page
                without review is risk. The interface should make intelligence
                feel like leverage, not magic.
              </p>

              <h2 className="design-md-section-title" id="principles">
                Product principles
              </h2>
              <ul className="design-md-principles">
                {principles.map((principle) => (
                  <li key={principle}>{principle}</li>
                ))}
              </ul>

              <h2 className="design-md-section-title">Core tokens</h2>
              <p>
                These are the public-facing values agents should preserve when
                generating product UI, docs pages, or marketing surfaces for
                OpenDocs.
              </p>
              <div className="design-md-token-grid">
                {tokens.map(([label, value, role]) => (
                  <div className="design-md-token" key={label}>
                    <span
                      className="design-md-swatch"
                      style={{ backgroundColor: value }}
                      aria-hidden="true"
                    />
                    <span>
                      <b>{label}</b>
                      <code>{value}</code>
                      <span>{role}</span>
                    </span>
                  </div>
                ))}
              </div>

              <h2 className="design-md-section-title">Interaction stance</h2>
              <p>
                Default states should be generous and readable. Empty states
                should teach the next action without sounding like setup errors.
                Hover states can lift gently, but the page should never feel
                twitchy. Focus states are visible, rounded, and aligned with the
                accent system.
              </p>

              <div className="design-md-empty-state">
                <div>
                  <div className="design-md-mini-mark" aria-hidden="true" />
                  <p className="design-md-kicker">Notes on building</p>
                  <p>
                    Pick a source of truth. Then make every action around it
                    obvious.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
