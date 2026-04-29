import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenDocs",
  description:
    "AI-native documentation platform for teams shipping docs, APIs, and product knowledge.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
