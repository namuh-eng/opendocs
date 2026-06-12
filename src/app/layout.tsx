import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import { PosthogProvider } from "@/components/observability/posthog-provider";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

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
    <html
      lang="en"
      data-theme="light"
      className={`light ${instrumentSerif.variable} ${inter.variable}`}
    >
      <body className="min-h-screen antialiased">
        <PosthogProvider>{children}</PosthogProvider>
      </body>
    </html>
  );
}
