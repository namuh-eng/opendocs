import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/docs/theme-provider";

export const metadata = {
  title: "Documentation",
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
