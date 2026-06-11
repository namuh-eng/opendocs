import { LandingView } from "@/components/landing/landing-view";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  // Font variables (--font-display / --font-body) come from the root layout.
  return <LandingView />;
}
