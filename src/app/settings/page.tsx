import { redirect } from "next/navigation";
import { SETTINGS_DEFAULT_HREF } from "@/lib/settings-nav";

export default function SettingsIndexPage() {
  redirect(SETTINGS_DEFAULT_HREF);
}
