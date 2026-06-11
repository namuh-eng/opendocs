import { AuthScreen } from "@/components/auth/auth-screen";
import { resolveSafeReturnTo } from "@/lib/auth-redirect";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, params] = await Promise.all([
    getServerSession(),
    searchParams,
  ]);
  const callbackURL = resolveSafeReturnTo(params.returnTo, "/dashboard");

  if (session) {
    redirect(callbackURL);
  }

  return <AuthScreen callbackURL={callbackURL} mode="login" />;
}
