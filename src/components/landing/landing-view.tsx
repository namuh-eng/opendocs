import Link from "next/link";

export function LandingView({
  fontClassName = "",
}: {
  fontClassName?: string;
}) {
  return (
    <main className={`lp-home ${fontClassName}`}>
      <style>{`
        .lp-home {
          min-height: 100vh;
          background: #f7f4ed;
          color: #1f1d2c;
          font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif;
          --bg: #f7f4ed;
          --bg-deep: #efe9db;
          --panel: #ffffff;
          --panel-warm: #faf6ec;
          --panel-muted: #f1ecdf;
          --border: #e5dfd0;
          --ink: #1f1d2c;
          --muted: #6b6878;
          --subtle: #948f9e;
          --accent: #6b7fd7;
          --accent-strong: #5466c2;
          --accent-deep: #3d4ea4;
          --accent-soft: #eaecf8;
          --terra: #c97455;
          --terra-soft: #f5e6dd;
          --sage: #8b9d7c;
          --sage-soft: #e8ede0;
          --gold: #c9a649;
          --gold-soft: #f4ecd2;
          --plum: #7e5a85;
          --plum-soft: #efe5f1;
          --dark-bg: #1a1827;
          --dark-text: #f4f1e6;
          --radius-sm: 10px;
          --radius-md: 16px;
          --radius-lg: 24px;
          --radius-xl: 28px;
          --shadow-sm: 0 2px 8px rgba(31,29,44,0.06);
          --shadow-md: 0 8px 24px rgba(31,29,44,0.08);
          --shadow-lg: 0 16px 40px rgba(31,29,44,0.10);
          --shadow-xl: 0 24px 64px rgba(31,29,44,0.12);
          font-feature-settings: "cv02", "cv03", "cv04", "cv11";
        }
        .lp-home ::selection {
          background: rgba(107,127,215,0.22);
        }
        .lp-home a:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
          border-radius: 6px;
        }
        .lp-home h1,
        .lp-home h2 {
          text-wrap: balance;
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-home *,
          .lp-home *::before,
          .lp-home *::after {
            animation: none !important;
            transition: none !important;
          }
        }

        /* ── NAV ── */
        .lp-home .nav {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          height: 60px;
          background: rgba(247,244,237,0.88);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
        }
        .lp-home .nav-wordmark {
          font-family: var(--font-display), Georgia, serif;
          font-size: 20px;
          color: var(--ink);
          text-decoration: none;
          letter-spacing: -0.01em;
          transition: color 0.2s;
        }
        .lp-home .nav-wordmark:hover {
          color: var(--accent-strong);
        }
        .lp-home .nav-links {
          display: flex;
          align-items: center;
          gap: 28px;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .lp-home .nav-links a {
          font-size: 14px;
          font-weight: 500;
          color: var(--muted);
          text-decoration: none;
          transition: color 0.2s;
        }
        .lp-home .nav-links a:hover {
          color: var(--ink);
        }
        .lp-home .nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .lp-home .btn-ghost {
          font-size: 14px;
          font-weight: 500;
          color: var(--muted);
          text-decoration: none;
          padding: 8px 14px;
          border-radius: 999px;
          transition: background 0.2s, color 0.2s;
        }
        .lp-home .btn-ghost:hover {
          background: var(--panel-muted);
          color: var(--ink);
        }
        .lp-home .btn-primary {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          text-decoration: none;
          padding: 8px 18px;
          border-radius: 999px;
          background: var(--accent-strong);
          box-shadow: 0 2px 8px rgba(84,102,194,0.28);
          transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
        }
        .lp-home .btn-primary:hover {
          background: var(--accent-deep);
          box-shadow: 0 4px 16px rgba(84,102,194,0.36);
          transform: translateY(-1px);
        }
        .lp-home .btn-primary-lg {
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 999px;
          background: var(--accent-strong);
          box-shadow: 0 4px 18px rgba(84,102,194,0.30);
          transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
          display: inline-block;
        }
        .lp-home .btn-primary-lg:hover {
          background: var(--accent-deep);
          box-shadow: 0 8px 28px rgba(84,102,194,0.40);
          transform: translateY(-2px);
        }
        .lp-home .btn-primary:active,
        .lp-home .btn-primary-lg:active,
        .lp-home .btn-secondary-lg:active,
        .lp-home .btn-cta-primary:active,
        .lp-home .btn-cta-ghost:active {
          transform: translateY(0);
        }
        .lp-home .btn-secondary-lg {
          font-size: 16px;
          font-weight: 500;
          color: var(--ink);
          text-decoration: none;
          padding: 13px 26px;
          border-radius: 999px;
          border: 1.5px solid var(--border);
          background: var(--panel);
          transition: background 0.2s, border-color 0.2s, transform 0.15s;
          display: inline-block;
        }
        .lp-home .btn-secondary-lg:hover {
          background: var(--panel-warm);
          border-color: #d3ccbe;
          transform: translateY(-1px);
        }

        /* ── HERO ── */
        .lp-home .hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 100px 40px 80px;
          gap: 0;
          background: radial-gradient(
            ellipse 920px 460px at 50% -8%,
            rgba(107,127,215,0.10),
            transparent 72%
          );
        }
        .lp-home .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 999px;
          background: var(--accent-soft);
          border: 1px solid rgba(107,127,215,0.20);
          font-size: 13px;
          font-weight: 600;
          color: var(--accent-strong);
          margin-bottom: 32px;
          letter-spacing: 0.02em;
        }
        .lp-home .hero-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          display: inline-block;
          animation: lp-wc-pulse 2s ease-in-out infinite;
        }
        @keyframes lp-wc-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.8); }
        }
        .lp-home .hero-headline {
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(48px, 7vw, 82px);
          font-weight: 400;
          line-height: 1.06;
          letter-spacing: -0.02em;
          color: var(--ink);
          margin: 0 0 28px;
          max-width: 820px;
        }
        .lp-home .hero-headline em {
          font-style: italic;
          color: var(--accent);
        }
        .lp-home .hero-subhead {
          font-size: 19px;
          font-weight: 400;
          line-height: 1.6;
          color: var(--muted);
          max-width: 540px;
          margin: 0 0 44px;
        }
        .lp-home .hero-ctas {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
        }

        /* ── ENTRANCE ANIMATIONS ── */
        @keyframes lp-wc-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes lp-wc-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lp-wc-settle {
          from { opacity: 0; transform: translateY(36px) scale(0.985); }
          to { opacity: 1; transform: none; }
        }
        @keyframes lp-wc-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-9px); }
        }
        .lp-home .hero-eyebrow,
        .lp-home .hero-headline,
        .lp-home .hero-subhead,
        .lp-home .hero-ctas {
          animation: lp-wc-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .lp-home .hero-headline { animation-delay: 0.08s; }
        .lp-home .hero-subhead { animation-delay: 0.16s; }
        .lp-home .hero-ctas { animation-delay: 0.24s; }

        /* Scroll-driven reveals (progressive enhancement) */
        @supports (animation-timeline: view()) {
          .lp-home .feature-card,
          .lp-home .stat-cell,
          .lp-home .quote-card {
            animation: lp-wc-rise both;
            animation-timeline: view();
            animation-range: entry 0% entry 38%;
          }
        }

        /* ── PRODUCT VISUAL ── */
        .lp-home .product-wrap {
          padding: 0 40px 100px;
          display: flex;
          justify-content: center;
          position: relative;
        }
        .lp-home .product-window {
          width: 100%;
          max-width: 1020px;
          background: var(--panel);
          border-radius: var(--radius-xl);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-xl), 0 1px 0 rgba(255,255,255,0.9) inset;
          overflow: hidden;
          animation: lp-wc-settle 0.9s 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .lp-home .float-pill {
          position: absolute;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 10px 16px;
          border-radius: 999px;
          background: var(--panel);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-md);
          font-size: 13px;
          font-weight: 600;
          color: var(--ink);
          animation: lp-wc-fade 0.6s 0.9s both, lp-wc-float 5.5s 1.5s ease-in-out infinite;
        }
        .lp-home .pill-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          font-size: 12px;
        }
        .lp-home .pill-icon-gold { background: var(--gold-soft); color: var(--gold); }
        .lp-home .pill-icon-accent { background: var(--accent-soft); color: var(--accent-strong); }
        .lp-home .float-pill-deploy {
          top: -16px;
          right: max(56px, calc(50% - 560px));
        }
        .lp-home .float-pill-ai {
          bottom: 64px;
          left: max(32px, calc(50% - 584px));
          animation-duration: 0.6s, 6.5s;
        }
        @media (max-width: 1100px) {
          .lp-home .float-pill { display: none; }
        }
        .lp-home .win-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px;
          background: var(--panel-muted);
          border-bottom: 1px solid var(--border);
        }
        .lp-home .win-dot {
          width: 11px;
          height: 11px;
          border-radius: 50%;
        }
        .lp-home .win-dot-r { background: #f87171; }
        .lp-home .win-dot-y { background: #fbbf24; }
        .lp-home .win-dot-g { background: #4ade80; }
        .lp-home .win-tabs {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: 14px;
        }
        .lp-home .win-tab {
          font-size: 12px;
          font-weight: 500;
          padding: 5px 14px;
          border-radius: 6px;
          color: var(--muted);
          cursor: default;
        }
        .lp-home .win-tab-active {
          background: var(--panel);
          color: var(--ink);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border);
        }
        .lp-home .win-url {
          flex: 1;
          max-width: 320px;
          margin-left: auto;
          height: 26px;
          border-radius: 6px;
          background: var(--panel);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          padding: 0 10px;
          gap: 6px;
          font-size: 11px;
          color: var(--subtle);
        }
        .lp-home .win-url-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--sage);
          flex-shrink: 0;
        }
        .lp-home .win-body {
          display: flex;
          height: 440px;
        }
        .lp-home .win-sidebar {
          width: 220px;
          flex-shrink: 0;
          border-right: 1px solid var(--border);
          background: var(--panel-warm);
          padding: 20px 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .lp-home .sidebar-section {
          padding: 6px 18px 2px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--subtle);
          margin-top: 8px;
        }
        .lp-home .sidebar-item {
          padding: 7px 18px;
          font-size: 13px;
          color: var(--muted);
          cursor: default;
          border-radius: 6px;
          margin: 0 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lp-home .sidebar-item-active {
          background: var(--accent-soft);
          color: var(--accent-strong);
          font-weight: 600;
        }
        .lp-home .sidebar-icon {
          width: 14px;
          height: 14px;
          border-radius: 3px;
          background: currentColor;
          opacity: 0.5;
          flex-shrink: 0;
        }
        .lp-home .sidebar-icon-sq { border-radius: 3px; }
        .lp-home .sidebar-icon-circ { border-radius: 50%; }
        .lp-home .sidebar-chip-new {
          margin-left: auto;
          padding: 1px 7px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          background: var(--gold-soft);
          color: var(--gold);
        }
        /* ── DASHBOARD MOCK (the real app, rethemed) ── */
        .lp-home .dash-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 22px 26px;
          overflow: hidden;
          min-width: 0;
        }
        .lp-home .dash-greeting-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--subtle);
        }
        .lp-home .dash-greeting {
          font-family: var(--font-display), Georgia, serif;
          font-size: 24px;
          color: var(--ink);
          letter-spacing: -0.01em;
          margin-top: 2px;
        }
        .lp-home .dash-greeting em { font-style: italic; color: var(--accent); }
        .lp-home .dash-project-card {
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--panel-warm);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .lp-home .dash-project-name {
          font-size: 14px;
          font-weight: 650;
          color: var(--ink);
        }
        .lp-home .dash-project-domain {
          font-size: 12px;
          color: var(--muted);
          font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
        }
        .lp-home .dash-live-badge {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          background: var(--sage-soft);
          color: var(--sage);
        }
        .lp-home .dash-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--sage);
          animation: lp-wc-pulse 2s ease-in-out infinite;
        }
        .lp-home .dash-quick-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .lp-home .dash-quick {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--panel);
          font-size: 12px;
          font-weight: 600;
          color: var(--ink);
          white-space: nowrap;
        }
        .lp-home .dash-quick-dot {
          width: 18px;
          height: 18px;
          border-radius: 6px;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
        }
        .lp-home .qd-terra { background: var(--terra-soft); color: var(--terra); }
        .lp-home .qd-sage { background: var(--sage-soft); color: var(--sage); }
        .lp-home .qd-plum { background: var(--plum-soft); color: var(--plum); }
        .lp-home .qd-gold { background: var(--gold-soft); color: var(--gold); }
        .lp-home .dash-deploys {
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--panel);
          overflow: hidden;
        }
        .lp-home .dash-deploys-head {
          padding: 9px 14px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--subtle);
          background: var(--panel-warm);
          border-bottom: 1px solid var(--border);
        }
        .lp-home .deploy-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          font-size: 12px;
          color: var(--muted);
          border-bottom: 1px solid var(--border);
        }
        .lp-home .deploy-row:last-child { border-bottom: none; }
        .lp-home .deploy-branch {
          font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
          font-size: 11.5px;
          color: var(--ink);
          font-weight: 500;
        }
        .lp-home .deploy-sha {
          font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
          font-size: 11px;
          color: var(--subtle);
        }
        .lp-home .deploy-time {
          margin-left: auto;
          font-size: 11px;
          color: var(--subtle);
        }
        .lp-home .deploy-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 2px 9px;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 600;
        }
        .lp-home .deploy-status-live { background: var(--sage-soft); color: var(--sage); }
        .lp-home .deploy-status-building { background: var(--gold-soft); color: var(--gold); }
        .lp-home .deploy-spinner {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          border: 1.5px solid var(--gold);
          border-top-color: transparent;
          animation: lp-wc-spin 0.9s linear infinite;
        }
        @keyframes lp-wc-spin {
          to { transform: rotate(360deg); }
        }
        .lp-home .deploy-progress {
          flex: 1;
          max-width: 110px;
          height: 4px;
          border-radius: 2px;
          background: var(--panel-muted);
          overflow: hidden;
        }
        .lp-home .deploy-progress-fill {
          height: 100%;
          border-radius: 2px;
          background: var(--gold);
          animation: lp-wc-build 2.6s ease-in-out infinite;
        }
        @keyframes lp-wc-build {
          0% { width: 18%; }
          60% { width: 78%; }
          100% { width: 92%; }
        }
        .lp-home .win-ai-panel {
          width: 260px;
          flex-shrink: 0;
          border-left: 1px solid var(--border);
          background: var(--panel);
          display: flex;
          flex-direction: column;
        }
        .lp-home .ai-header {
          padding: 14px 16px 12px;
          border-bottom: 1px solid var(--border);
          font-size: 12px;
          font-weight: 700;
          color: var(--ink);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lp-home .ai-glow {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 0 3px rgba(107,127,215,0.20);
          animation: lp-wc-glow 2.4s ease-in-out infinite;
        }
        @keyframes lp-wc-glow {
          0%, 100% { box-shadow: 0 0 0 3px rgba(107,127,215,0.20); }
          50% { box-shadow: 0 0 0 6px rgba(107,127,215,0.10); }
        }
        .lp-home .ai-messages {
          flex: 1;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow: hidden;
        }
        .lp-home .ai-msg {
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          line-height: 1.5;
        }
        .lp-home .ai-msg-user {
          background: var(--panel-muted);
          color: var(--muted);
          align-self: flex-end;
          max-width: 85%;
        }
        .lp-home .ai-msg-bot {
          background: var(--accent-soft);
          border: 1px solid rgba(107,127,215,0.15);
          color: var(--ink);
        }
        .lp-home .ai-input {
          margin: 10px 12px 14px;
          border-radius: 8px;
          border: 1.5px solid var(--border);
          background: var(--bg);
          height: 34px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 8px;
        }
        .lp-home .ai-input-line {
          flex: 1;
          height: 8px;
          border-radius: 3px;
          background: var(--border);
        }
        .lp-home .ai-typing {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          background: var(--accent-soft);
          border: 1px solid rgba(107,127,215,0.15);
          align-self: flex-start;
        }
        .lp-home .ai-typing span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          opacity: 0.35;
          animation: lp-wc-typing 1.2s ease-in-out infinite;
        }
        .lp-home .ai-typing span:nth-child(2) { animation-delay: 0.18s; }
        .lp-home .ai-typing span:nth-child(3) { animation-delay: 0.36s; }
        @keyframes lp-wc-typing {
          0%, 60%, 100% { opacity: 0.35; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
        .lp-home .ai-send {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          background: var(--accent-strong);
          flex-shrink: 0;
        }

        /* ── FEATURES ── */
        .lp-home .features {
          padding: 80px 40px 100px;
          background: var(--bg-deep);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .lp-home .section-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--subtle);
          margin-bottom: 20px;
        }
        .lp-home .section-label-line {
          width: 24px;
          height: 1.5px;
          background: var(--subtle);
          border-radius: 1px;
        }
        .lp-home .section-headline {
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(32px, 4vw, 52px);
          font-weight: 400;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: var(--ink);
          margin: 0 0 16px;
          max-width: 540px;
        }
        .lp-home .section-headline em {
          font-style: italic;
          color: var(--accent);
        }
        .lp-home .section-sub {
          font-size: 17px;
          line-height: 1.6;
          color: var(--muted);
          max-width: 460px;
          margin: 0 0 56px;
        }
        .lp-home .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .lp-home .feature-card {
          background: var(--panel);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          padding: 28px;
          box-shadow: var(--shadow-sm);
          transition: box-shadow 0.25s, transform 0.2s;
        }
        .lp-home .feature-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
          border-color: rgba(107,127,215,0.35);
        }
        .lp-home .feature-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
          font-size: 20px;
        }
        .lp-home .feature-icon-terra { background: var(--terra-soft); color: var(--terra); }
        .lp-home .feature-icon-sage  { background: var(--sage-soft); color: var(--sage); }
        .lp-home .feature-icon-accent { background: var(--accent-soft); color: var(--accent-strong); }
        .lp-home .feature-icon-plum  { background: var(--plum-soft); color: var(--plum); }
        .lp-home .feature-icon-gold  { background: var(--gold-soft); color: var(--gold); }
        .lp-home .feature-title {
          font-size: 17px;
          font-weight: 650;
          color: var(--ink);
          margin: 0 0 10px;
          letter-spacing: -0.01em;
        }
        .lp-home .feature-desc {
          font-size: 14px;
          line-height: 1.65;
          color: var(--muted);
          margin: 0 0 18px;
        }
        .lp-home .feature-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid transparent;
        }
        .lp-home .chip-terra { background: var(--terra-soft); color: var(--terra); border-color: rgba(201,116,85,0.20); }
        .lp-home .chip-sage  { background: var(--sage-soft); color: var(--sage); border-color: rgba(139,157,124,0.20); }
        .lp-home .chip-accent { background: var(--accent-soft); color: var(--accent-strong); border-color: rgba(107,127,215,0.20); }
        .lp-home .chip-plum  { background: var(--plum-soft); color: var(--plum); border-color: rgba(126,90,133,0.20); }
        .lp-home .chip-gold  { background: var(--gold-soft); color: var(--gold); border-color: rgba(201,166,73,0.20); }

        /* ── CODE SECTION (dark ink) ── */
        .lp-home .code-section {
          background: var(--dark-bg);
          color: var(--dark-text);
          padding: 100px 40px;
        }
        .lp-home .code-section .section-label {
          color: rgba(244,241,230,0.40);
          display: flex;
          max-width: 960px;
          margin: 0 auto 28px;
        }
        .lp-home .code-section .section-label-line {
          background: rgba(244,241,230,0.40);
        }
        .lp-home .code-inner {
          max-width: 960px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }
        .lp-home .code-copy h2 {
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(28px, 3.5vw, 46px);
          font-weight: 400;
          line-height: 1.12;
          letter-spacing: -0.02em;
          color: var(--dark-text);
          margin: 0 0 16px;
        }
        .lp-home .code-copy h2 em {
          font-style: italic;
          color: var(--gold);
        }
        .lp-home .code-copy p {
          font-size: 16px;
          line-height: 1.7;
          color: rgba(244,241,230,0.60);
          margin: 0 0 32px;
        }
        .lp-home .code-snippet {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.40);
        }
        .lp-home .snippet-header {
          padding: 12px 16px;
          background: rgba(255,255,255,0.04);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .lp-home .snippet-dots {
          display: flex;
          gap: 6px;
        }
        .lp-home .snippet-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
        }
        .lp-home .snippet-lang {
          margin-left: auto;
          font-size: 11px;
          font-weight: 600;
          font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
          color: rgba(244,241,230,0.35);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .lp-home .snippet-body {
          padding: 24px 24px 28px;
          font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
          font-size: 13px;
          line-height: 1.75;
          color: rgba(244,241,230,0.80);
        }
        .lp-home .tok-keyword { color: #a78bfa; }
        .lp-home .tok-string  { color: #86efac; }
        .lp-home .tok-comment { color: rgba(244,241,230,0.30); font-style: italic; }
        .lp-home .tok-fn      { color: #93c5fd; }
        .lp-home .tok-num     { color: #fcd34d; }
        .lp-home .tok-prop    { color: var(--dark-text); }
        .lp-home .code-endpoint-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 0;
        }
        .lp-home .endpoint-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
        }
        .lp-home .method-badge {
          font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          min-width: 42px;
          text-align: center;
        }
        .lp-home .method-get  { background: rgba(134,239,172,0.15); color: #86efac; }
        .lp-home .method-post { background: rgba(147,197,253,0.15); color: #93c5fd; }
        .lp-home .method-del  { background: rgba(252,165,165,0.15); color: #fca5a5; }
        .lp-home .endpoint-path {
          font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
          font-size: 12.5px;
          color: rgba(244,241,230,0.70);
        }
        .lp-home .endpoint-desc {
          margin-left: auto;
          font-size: 12px;
          color: rgba(244,241,230,0.30);
        }

        /* ── STATS ── */
        .lp-home .stats {
          padding: 80px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .lp-home .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 2px;
          max-width: 860px;
          width: 100%;
          background: var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid var(--border);
          margin-bottom: 60px;
          box-shadow: var(--shadow-sm);
        }
        .lp-home .stat-cell {
          background: var(--panel);
          padding: 36px 28px;
          text-align: center;
        }
        .lp-home .stat-num {
          font-family: var(--font-display), Georgia, serif;
          font-size: 44px;
          font-weight: 400;
          color: var(--ink);
          letter-spacing: -0.03em;
          line-height: 1;
          margin-bottom: 8px;
        }
        .lp-home .stat-num em { font-style: italic; color: var(--accent); }
        .lp-home .stat-label {
          font-size: 13px;
          color: var(--muted);
          font-weight: 500;
        }
        .lp-home .quotes-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
          max-width: 860px;
          width: 100%;
        }
        .lp-home .quote-card {
          background: var(--panel-warm);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 24px;
          box-shadow: var(--shadow-sm);
        }
        .lp-home .quote-mark {
          font-family: var(--font-display), Georgia, serif;
          font-style: italic;
          font-size: 46px;
          line-height: 0.8;
          color: var(--accent);
          opacity: 0.45;
          margin-bottom: 12px;
        }
        .lp-home .quote-text {
          font-size: 14px;
          line-height: 1.65;
          color: var(--ink);
          margin-bottom: 16px;
          font-style: italic;
          font-family: var(--font-display), Georgia, serif;
        }
        .lp-home .quote-author {
          font-size: 12px;
          font-weight: 600;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lp-home .quote-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
        }
        .lp-home .quote-av-terra { background: var(--terra); }
        .lp-home .quote-av-sage  { background: var(--sage); }
        .lp-home .quote-av-plum  { background: var(--plum); }

        /* ── FINAL CTA ── */
        .lp-home .cta-band {
          margin: 0 40px 80px;
          background: var(--ink);
          border-radius: var(--radius-xl);
          padding: 80px 60px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .lp-home .cta-band-glow {
          position: absolute;
          width: 500px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(107,127,215,0.18) 0%, transparent 70%);
          top: -60px;
          left: 50%;
          transform: translateX(-50%);
          pointer-events: none;
        }
        .lp-home .cta-band-glow-warm {
          position: absolute;
          width: 420px;
          height: 260px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(201,166,73,0.10) 0%, transparent 70%);
          bottom: -100px;
          right: -60px;
          pointer-events: none;
        }
        .lp-home .cta-band h2 {
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(32px, 5vw, 60px);
          font-weight: 400;
          line-height: 1.08;
          letter-spacing: -0.02em;
          color: var(--dark-text);
          margin: 0 0 20px;
          position: relative;
        }
        .lp-home .cta-band h2 em {
          font-style: italic;
          color: var(--accent);
        }
        .lp-home .cta-band p {
          font-size: 17px;
          line-height: 1.6;
          color: rgba(244,241,230,0.58);
          max-width: 460px;
          margin: 0 auto 40px;
          position: relative;
        }
        .lp-home .cta-band-btns {
          display: flex;
          align-items: center;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
          position: relative;
        }
        .lp-home .btn-cta-primary {
          font-size: 15px;
          font-weight: 600;
          color: var(--ink);
          text-decoration: none;
          padding: 13px 28px;
          border-radius: 999px;
          background: var(--dark-text);
          transition: background 0.2s, transform 0.15s;
          display: inline-block;
        }
        .lp-home .btn-cta-primary:hover {
          background: #fff;
          transform: translateY(-2px);
        }
        .lp-home .btn-cta-ghost {
          font-size: 15px;
          font-weight: 500;
          color: rgba(244,241,230,0.65);
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 999px;
          border: 1px solid rgba(244,241,230,0.18);
          transition: border-color 0.2s, color 0.2s, transform 0.15s;
          display: inline-block;
        }
        .lp-home .btn-cta-ghost:hover {
          border-color: rgba(244,241,230,0.40);
          color: rgba(244,241,230,0.90);
          transform: translateY(-1px);
        }

        /* ── FOOTER ── */
        .lp-home footer {
          border-top: 1px solid var(--border);
          padding: 48px 40px 36px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 40px;
          flex-wrap: wrap;
        }
        .lp-home .footer-brand {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .lp-home .footer-wordmark {
          font-family: var(--font-display), Georgia, serif;
          font-size: 18px;
          color: var(--ink);
          text-decoration: none;
        }
        .lp-home .footer-tagline {
          font-size: 13px;
          color: var(--subtle);
          max-width: 200px;
          line-height: 1.5;
        }
        .lp-home .footer-cols {
          display: flex;
          gap: 52px;
          flex-wrap: wrap;
        }
        .lp-home .footer-col-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--subtle);
          margin-bottom: 14px;
        }
        .lp-home .footer-col-links {
          display: flex;
          flex-direction: column;
          gap: 8px;
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .lp-home .footer-col-links a {
          font-size: 13px;
          color: var(--muted);
          text-decoration: none;
          transition: color 0.2s;
        }
        .lp-home .footer-col-links a:hover {
          color: var(--ink);
        }
        .lp-home .footer-bottom {
          border-top: 1px solid var(--border);
          padding: 20px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .lp-home .footer-copy {
          font-size: 12px;
          color: var(--subtle);
        }
        .lp-home .footer-bottom-links {
          display: flex;
          gap: 20px;
        }
        .lp-home .footer-bottom-links a {
          font-size: 12px;
          color: var(--subtle);
          text-decoration: none;
          transition: color 0.2s;
        }
        .lp-home .footer-bottom-links a:hover {
          color: var(--muted);
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .lp-home .nav {
            padding: 0 20px;
          }
          .lp-home .nav-links {
            display: none;
          }
          .lp-home .hero {
            padding: 64px 24px 60px;
          }
          .lp-home .product-wrap {
            padding: 0 20px 60px;
          }
          .lp-home .win-body {
            height: auto;
            flex-direction: column;
          }
          .lp-home .win-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--border);
            padding: 12px 0;
            flex-direction: row;
            flex-wrap: wrap;
          }
          .lp-home .win-ai-panel {
            width: 100%;
            border-left: none;
            border-top: 1px solid var(--border);
          }
          .lp-home .dash-main {
            min-height: 260px;
          }
          .lp-home .dash-quick-row {
            grid-template-columns: repeat(2, 1fr);
          }
          .lp-home .features {
            padding: 60px 24px 70px;
          }
          .lp-home .code-section {
            padding: 70px 24px;
          }
          .lp-home .code-inner {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .lp-home .stats {
            padding: 60px 24px;
          }
          .lp-home .cta-band {
            margin: 0 20px 60px;
            padding: 60px 30px;
          }
          .lp-home footer {
            padding: 40px 24px 28px;
            flex-direction: column;
          }
          .lp-home .footer-bottom {
            padding: 16px 24px;
            flex-direction: column;
            align-items: flex-start;
          }
        }
        @media (max-width: 480px) {
          .lp-home .hero-headline {
            font-size: 38px;
          }
          .lp-home .hero-subhead {
            font-size: 16px;
          }
          .lp-home .btn-primary-lg,
          .lp-home .btn-secondary-lg {
            width: 100%;
            text-align: center;
          }
          .lp-home .hero-ctas {
            flex-direction: column;
            width: 100%;
          }
          .lp-home .win-url {
            display: none;
          }
        }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <Link href="/" className="nav-wordmark">
          OpenDocs
        </Link>
        <ul className="nav-links">
          <li>
            <Link href="/docs">Docs</Link>
          </li>
          <li>
            <Link href="/pricing">Pricing</Link>
          </li>
          <li>
            <Link href="/changelog">Changelog</Link>
          </li>
        </ul>
        <div className="nav-actions">
          <Link href="/login" className="btn-ghost">
            Log in
          </Link>
          <Link href="/onboarding" className="btn-primary">
            Start onboarding
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <span className="hero-eyebrow">
          <span className="hero-dot" />
          Now in public beta
        </span>
        <h1 className="hero-headline">
          Documentation that
          <br />
          <em>thinks</em> with you
        </h1>
        <p className="hero-subhead">
          Author MDX docs, publish API references, ship deployment previews, and
          let your readers ask questions — all in one crafted platform.
        </p>
        <div className="hero-ctas">
          <Link href="/onboarding" className="btn-primary-lg">
            Start onboarding
          </Link>
          <Link href="/dashboard" className="btn-secondary-lg">
            Open dashboard
          </Link>
        </div>
      </section>

      {/* PRODUCT VISUAL — the real dashboard, rethemed */}
      <div className="product-wrap">
        <div className="float-pill float-pill-deploy">
          <span className="pill-icon pill-icon-gold">⚡</span>
          Deployed in 3s
        </div>
        <div className="float-pill float-pill-ai">
          <span className="pill-icon pill-icon-accent">✦</span>
          Answers cite sources
        </div>
        <div className="product-window">
          {/* Window chrome */}
          <div className="win-toolbar">
            <span className="win-dot win-dot-r" />
            <span className="win-dot win-dot-y" />
            <span className="win-dot win-dot-g" />
            <div className="win-tabs">
              <span className="win-tab win-tab-active">Dashboard</span>
              <span className="win-tab">Editor</span>
              <span className="win-tab">Analytics</span>
            </div>
            <div className="win-url">
              <span className="win-url-dot" />
              app.opendocs.dev / dashboard
            </div>
          </div>

          <div className="win-body">
            {/* Sidebar — mirrors the real app nav */}
            <div className="win-sidebar">
              <div className="sidebar-section">Workspace</div>
              <div className="sidebar-item sidebar-item-active">
                <span className="sidebar-icon sidebar-icon-sq" />
                Home
              </div>
              <div className="sidebar-item">
                <span className="sidebar-icon sidebar-icon-sq" />
                Editor
              </div>
              <div className="sidebar-item">
                <span className="sidebar-icon sidebar-icon-sq" />
                Analytics
              </div>
              <div className="sidebar-item">
                <span className="sidebar-icon sidebar-icon-sq" />
                Settings
              </div>
              <div className="sidebar-section">AI Products</div>
              <div className="sidebar-item">
                <span className="sidebar-icon sidebar-icon-circ" />
                Agent
                <span className="sidebar-chip-new">New</span>
              </div>
              <div className="sidebar-item">
                <span className="sidebar-icon sidebar-icon-circ" />
                Assistant
              </div>
              <div className="sidebar-item">
                <span className="sidebar-icon sidebar-icon-circ" />
                Workflows
              </div>
            </div>

            {/* Dashboard home */}
            <div className="dash-main">
              <div>
                <div className="dash-greeting-label">Wednesday, June 11</div>
                <div className="dash-greeting">
                  Good evening, <em>Sofia</em>
                </div>
              </div>

              <div className="dash-project-card">
                <span className="dash-project-name">acme-docs</span>
                <span className="dash-project-domain">docs.acme.com</span>
                <span className="dash-live-badge">
                  <span className="dash-live-dot" />
                  Live
                </span>
              </div>

              <div className="dash-quick-row">
                <div className="dash-quick">
                  <span className="dash-quick-dot qd-terra">✎</span>
                  Open editor
                </div>
                <div className="dash-quick">
                  <span className="dash-quick-dot qd-sage">◍</span>
                  View site
                </div>
                <div className="dash-quick">
                  <span className="dash-quick-dot qd-plum">◔</span>
                  Analytics
                </div>
                <div className="dash-quick">
                  <span className="dash-quick-dot qd-gold">⚙</span>
                  Settings
                </div>
              </div>

              <div className="dash-deploys">
                <div className="dash-deploys-head">Recent deployments</div>
                <div className="deploy-row">
                  <span className="deploy-status deploy-status-live">
                    ✓ Live
                  </span>
                  <span className="deploy-branch">main</span>
                  <span className="deploy-sha">8f2c1a4</span>
                  <span className="deploy-time">3m ago</span>
                </div>
                <div className="deploy-row">
                  <span className="deploy-status deploy-status-building">
                    <span className="deploy-spinner" />
                    Building
                  </span>
                  <span className="deploy-branch">feat/auth-guide</span>
                  <div className="deploy-progress">
                    <div className="deploy-progress-fill" />
                  </div>
                  <span className="deploy-time">just now</span>
                </div>
                <div className="deploy-row">
                  <span className="deploy-status deploy-status-live">
                    ✓ Preview
                  </span>
                  <span className="deploy-branch">fix/typos</span>
                  <span className="deploy-sha">c91e07b</span>
                  <span className="deploy-time">1h ago</span>
                </div>
              </div>
            </div>

            {/* AI Panel */}
            <div className="win-ai-panel">
              <div className="ai-header">
                <span className="ai-glow" />
                Ask AI
              </div>
              <div className="ai-messages">
                <div className="ai-msg ai-msg-user">
                  How do I rotate my API key?
                </div>
                <div className="ai-msg ai-msg-bot">
                  Go to Settings → API Keys, click the key you want to rotate,
                  then choose Regenerate. Your old key will stay valid for 24
                  hours.
                </div>
                <div className="ai-msg ai-msg-user">
                  What about OAuth scopes?
                </div>
                <div className="ai-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="ai-input">
                <div className="ai-input-line" />
                <div className="ai-send" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" className="features">
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div className="section-label">
            <span className="section-label-line" />
            Everything you need
          </div>
          <h2 className="section-headline">
            Built for teams who
            <br />
            care about <em>craft</em>
          </h2>
          <p className="section-sub">
            From MDX authoring to AI-powered search, every feature is designed
            for documentation that delights.
          </p>

          <div className="features-grid">
            {/* MDX docs */}
            <div className="feature-card">
              <div className="feature-icon-wrap feature-icon-terra">
                <span style={{ fontSize: "20px" }}>✦</span>
              </div>
              <div className="feature-title">MDX Docs & API Reference</div>
              <p className="feature-desc">
                Write in MDX with live previews, custom components, and
                automatic OpenAPI reference generation from your schema.
              </p>
              <span className="feature-chip chip-terra">MDX + OpenAPI</span>
            </div>

            {/* Deployment previews */}
            <div className="feature-card">
              <div className="feature-icon-wrap feature-icon-sage">
                <span style={{ fontSize: "20px" }}>⎇</span>
              </div>
              <div className="feature-title">Deployment Previews</div>
              <p className="feature-desc">
                Every pull request gets its own preview URL. Share docs changes
                before they merge — review, comment, approve.
              </p>
              <span className="feature-chip chip-sage">Branch Workflow</span>
            </div>

            {/* Ask AI */}
            <div className="feature-card">
              <div className="feature-icon-wrap feature-icon-accent">
                <span style={{ fontSize: "20px" }}>◈</span>
              </div>
              <div className="feature-title">Ask-AI Assistant</div>
              <p className="feature-desc">
                Readers get instant, accurate answers sourced from your actual
                docs. No hallucinations — answers cite the exact page and
                section.
              </p>
              <span className="feature-chip chip-accent">AI-powered</span>
            </div>

            {/* Analytics */}
            <div className="feature-card">
              <div className="feature-icon-wrap feature-icon-plum">
                <span style={{ fontSize: "20px" }}>◉</span>
              </div>
              <div className="feature-title">Analytics & Search</div>
              <p className="feature-desc">
                See which pages convert, where readers drop off, and what they
                search for. Semantic search that understands intent.
              </p>
              <span className="feature-chip chip-plum">Insights</span>
            </div>

            {/* Versioning */}
            <div className="feature-card">
              <div className="feature-icon-wrap feature-icon-gold">
                <span style={{ fontSize: "20px" }}>◎</span>
              </div>
              <div className="feature-title">Version Management</div>
              <p className="feature-desc">
                Maintain multiple doc versions side-by-side. Readers always land
                on the right version; you keep one authoring workflow.
              </p>
              <span className="feature-chip chip-gold">Multi-version</span>
            </div>

            {/* Custom domains */}
            <div className="feature-card">
              <div className="feature-icon-wrap feature-icon-terra">
                <span style={{ fontSize: "20px" }}>⌘</span>
              </div>
              <div className="feature-title">Custom Domains & Theming</div>
              <p className="feature-desc">
                Publish to your own domain in minutes. Fully brandable — colors,
                fonts, logo, dark mode — with zero lock-in.
              </p>
              <span className="feature-chip chip-terra">White-label ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* CODE / API SECTION (dark ink) */}
      <section id="api" className="code-section">
        <div className="section-label">
          <span className="section-label-line" />
          Developer-first
        </div>
        <div className="code-inner">
          <div className="code-copy">
            <h2>
              Automate docs with
              <br />a clean <em>REST API</em>
            </h2>
            <p>
              Push content from CI, sync from your codebase, or build custom
              integrations — the OpenDocs API puts your docs in version control
              where they belong.
            </p>
            <div className="code-endpoint-list">
              <div className="endpoint-row">
                <span className="method-badge method-get">GET</span>
                <span className="endpoint-path">/v1/docs/:slug</span>
                <span className="endpoint-desc">Fetch page</span>
              </div>
              <div className="endpoint-row">
                <span className="method-badge method-post">POST</span>
                <span className="endpoint-path">/v1/docs</span>
                <span className="endpoint-desc">Create page</span>
              </div>
              <div className="endpoint-row">
                <span className="method-badge method-post">POST</span>
                <span className="endpoint-path">/v1/deploys</span>
                <span className="endpoint-desc">Trigger deploy</span>
              </div>
              <div className="endpoint-row">
                <span className="method-badge method-del">DEL</span>
                <span className="endpoint-path">/v1/docs/:slug</span>
                <span className="endpoint-desc">Archive page</span>
              </div>
            </div>
          </div>

          <div className="code-snippet">
            <div className="snippet-header">
              <div className="snippet-dots">
                <span className="snippet-dot" />
                <span className="snippet-dot" />
                <span className="snippet-dot" />
              </div>
              <span className="snippet-lang">TypeScript</span>
            </div>
            <div className="snippet-body">
              <div>
                <span className="tok-keyword">import</span> {"{ OpenDocs }"}{" "}
                <span className="tok-keyword">from</span>{" "}
                <span className="tok-string">'@opendocs/sdk'</span>
              </div>
              <br />
              <div>
                <span className="tok-keyword">const</span>
                {" client = "}
                <span className="tok-keyword">new</span>{" "}
                <span className="tok-fn">OpenDocs</span>
                {"({"}
              </div>
              <div>
                {"  "}
                <span className="tok-prop">apiKey</span>
                {": process.env."}
                <span className="tok-prop">OPENDOCS_KEY</span>
                {","}
              </div>
              <div>{"});"}</div>
              <br />
              <div>
                <span className="tok-comment">{"// Push a page from CI"}</span>
              </div>
              <div>
                <span className="tok-keyword">await</span>
                {" client.docs."}
                <span className="tok-fn">upsert</span>
                {"({"}
              </div>
              <div>
                {"  "}
                <span className="tok-prop">slug</span>
                {": "}
                <span className="tok-string">'guides/auth'</span>
                {","}
              </div>
              <div>
                {"  "}
                <span className="tok-prop">content</span>
                {": fs."}
                <span className="tok-fn">readFileSync</span>
                <span className="tok-string">{'("./auth.mdx")'}</span>
                {","}
              </div>
              <div>
                {"  "}
                <span className="tok-prop">publishOnMerge</span>
                {": "}
                <span className="tok-keyword">true</span>
                {","}
              </div>
              <div>{"});"}</div>
              <br />
              <div>
                <span className="tok-comment">
                  {"// → { id: 'pg_8xkz…', preview: '…' }"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS / SOCIAL PROOF */}
      <section id="customers" className="stats">
        <div className="section-label" style={{ marginBottom: "32px" }}>
          <span className="section-label-line" />
          Trusted by teams shipping great docs
        </div>
        <div className="stats-grid">
          <div className="stat-cell">
            <div className="stat-num">
              <em>4.2M</em>
            </div>
            <div className="stat-label">docs pages published</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">
              98<em>%</em>
            </div>
            <div className="stat-label">Ask-AI accuracy</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">
              <em>12k</em>
            </div>
            <div className="stat-label">teams onboarded</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">
              3<em>s</em>
            </div>
            <div className="stat-label">average deploy time</div>
          </div>
        </div>

        <div className="quotes-row">
          <div className="quote-card">
            <div className="quote-mark">&ldquo;</div>
            <p className="quote-text">
              We replaced three tools with OpenDocs. Our docs are finally
              something we&apos;re proud to send to customers.
            </p>
            <div className="quote-author">
              <span className="quote-avatar quote-av-terra">SL</span>
              <div>
                <div>Sofia L.</div>
                <div style={{ fontWeight: 400, color: "var(--subtle)" }}>
                  Head of Developer Experience
                </div>
              </div>
            </div>
          </div>
          <div className="quote-card">
            <div className="quote-mark">&ldquo;</div>
            <p className="quote-text">
              The branch preview workflow alone saved our team two hours per
              release. The Ask-AI assistant is eerily accurate.
            </p>
            <div className="quote-author">
              <span className="quote-avatar quote-av-sage">MK</span>
              <div>
                <div>Marcus K.</div>
                <div style={{ fontWeight: 400, color: "var(--subtle)" }}>
                  Staff Engineer
                </div>
              </div>
            </div>
          </div>
          <div className="quote-card">
            <div className="quote-mark">&ldquo;</div>
            <p className="quote-text">
              OpenDocs analytics showed us which pages caused support tickets.
              We fixed them and our ticket volume dropped by 40%.
            </p>
            <div className="quote-author">
              <span className="quote-avatar quote-av-plum">AR</span>
              <div>
                <div>Aiko R.</div>
                <div style={{ fontWeight: 400, color: "var(--subtle)" }}>
                  Product Manager
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <div id="start" className="cta-band">
        <div className="cta-band-glow" />
        <div className="cta-band-glow-warm" />
        <h2>
          Your docs deserve
          <br />
          <em>better</em> than a wiki
        </h2>
        <p>
          Start publishing documentation your users will actually read — and
          your team will actually maintain.
        </p>
        <div className="cta-band-btns">
          <Link href="/onboarding" className="btn-cta-primary">
            Start onboarding — it&apos;s free
          </Link>
          <Link href="/dashboard" className="btn-cta-ghost">
            Open dashboard
          </Link>
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <div className="footer-brand">
          <Link href="/" className="footer-wordmark">
            OpenDocs
          </Link>
          <div className="footer-tagline">
            AI-native documentation for teams who care about craft.
          </div>
        </div>
        <div className="footer-cols">
          <div>
            <div className="footer-col-title">Product</div>
            <ul className="footer-col-links">
              <li>
                <Link href="/#features">Features</Link>
              </li>
              <li>
                <Link href="/pricing">Pricing</Link>
              </li>
              <li>
                <Link href="/changelog">Changelog</Link>
              </li>
              <li>
                <Link href="/changelog#roadmap">Roadmap</Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Developers</div>
            <ul className="footer-col-links">
              <li>
                <Link href="/#api">API Reference</Link>
              </li>
              <li>
                <Link href="/#api">SDK</Link>
              </li>
              <li>
                <Link href="/#api">Webhooks</Link>
              </li>
              <li>
                <Link href="/onboarding">Quickstart</Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Company</div>
            <ul className="footer-col-links">
              <li>
                <Link href="/#customers">About</Link>
              </li>
              <li>
                <Link href="/changelog">Blog</Link>
              </li>
              <li>
                <Link href="/changelog#roadmap">Careers</Link>
              </li>
              <li>
                <Link href="/changelog#status">Status</Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
      <div className="footer-bottom">
        <span className="footer-copy">© 2026 OpenDocs, Inc.</span>
        <div className="footer-bottom-links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/security">Security</Link>
        </div>
      </div>
    </main>
  );
}
