import { redirect } from "next/navigation";
import { GoogleAuthCard } from "@/components/auth/google-auth-card";
import { resolveSafeReturnTo } from "@/lib/auth-redirect";
import { getServerSession } from "@/lib/session";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, params] = await Promise.all([
    getServerSession(),
    searchParams,
  ]);
  const callbackURL = resolveSafeReturnTo(params.returnTo, "/onboarding");

  if (session) {
    redirect(resolveSafeReturnTo(params.returnTo, "/dashboard"));
  }

  return <GoogleAuthCard callbackURL={callbackURL} mode="signup" />;
}
