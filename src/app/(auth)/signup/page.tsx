import { AuthScreen } from "@/components/auth/auth-screen";
import { resolveSafeReturnTo } from "@/lib/auth-redirect";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

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

  return <AuthScreen callbackURL={callbackURL} mode="signup" />;
}
