import { AuthScreen } from "@/components/auth/auth-screen";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

// Google OAuth is the only auth method offered right now — GitHub/SSO, the
// email form, and magic link are hidden (SHOW_ALTERNATE_AUTH in auth-screen).
describe("AuthScreen", () => {
  it("renders the split login screen with Google as the only method", () => {
    const html = renderToStaticMarkup(
      <AuthScreen callbackURL="/dashboard" mode="login" />,
    );

    expect(html).toContain("Welcome");
    expect(html).toContain("back.");
    expect(html).toContain("Docs you ship like product.");
    expect(html).toContain("Continue with Google");
    expect(html).not.toContain("SSO");
    expect(html).not.toContain("Or with email");
    expect(html).not.toContain("Work email");
    expect(html).not.toContain("magic link");
  });

  it("renders the Google-only signup screen with the mock copy", () => {
    const html = renderToStaticMarkup(
      <AuthScreen callbackURL="/onboarding" mode="signup" />,
    );

    expect(html).toContain("Make your docs");
    expect(html).toContain("matter.");
    expect(html).toContain("An AI-native docs platform");
    expect(html).toContain("Free · No credit card");
    expect(html).toContain("Continue with Google");
    expect(html).not.toContain("Your name");
    expect(html).not.toContain("Create workspace");
    expect(html).not.toContain("Privacy Policy");
  });

  it("uses exactly one h1 per screen for accessibility and e2e stability", () => {
    for (const mode of ["login", "signup"] as const) {
      const html = renderToStaticMarkup(
        <AuthScreen callbackURL="/dashboard" mode={mode} />,
      );
      expect(html.match(/<h1/g)).toHaveLength(1);
    }
  });
});
