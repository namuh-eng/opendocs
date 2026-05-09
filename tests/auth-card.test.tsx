import { GoogleAuthCard } from "@/components/auth/google-auth-card";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("GoogleAuthCard", () => {
  it("renders Mintlify-style email/password and Google options on login", () => {
    const html = renderToStaticMarkup(
      <GoogleAuthCard callbackURL="/dashboard" mode="login" />,
    );

    expect(html).toContain("Enter your email");
    expect(html).toContain("Enter your password");
    expect(html).toContain("Continue with password");
    expect(html).toContain("Continue with Google");
  });

  it("renders signup email/password flow with Continue with email", () => {
    const html = renderToStaticMarkup(
      <GoogleAuthCard callbackURL="/onboarding" mode="signup" />,
    );

    expect(html).toContain("Enter your name");
    expect(html).toContain("Enter your email");
    expect(html).toContain("Enter your password");
    expect(html).toContain("Continue with email");
    expect(html).toContain("Continue with Google");
  });
});
