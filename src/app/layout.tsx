import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000"),
  ),
  title: {
    default: "SkillGRID",
    template: "%s · SkillGRID",
  },
  description:
    "Direct 1:1 peer-to-peer skill exchange. Teach what you know, learn what you need.",
  applicationName: "SkillGRID",
  openGraph: {
    type: "website",
    siteName: "SkillGRID",
    title: "SkillGRID — teach what you know, learn what you need",
    description:
      "Direct 1:1 peer-to-peer skill exchange. Two people, reciprocal skills, one session at a time.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SkillGRID — teach what you know, learn what you need",
    description:
      "Direct 1:1 peer-to-peer skill exchange. Two people, reciprocal skills, one session at a time.",
  },
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
