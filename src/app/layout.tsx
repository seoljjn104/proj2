import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { Fraunces } from "next/font/google";
import { AuthProvider } from "@/hooks/useAuth";
import ThemeProvider, {
  THEME_INIT_SCRIPT,
} from "@/components/theme/ThemeProvider";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e8" },
    { media: "(prefers-color-scheme: dark)", color: "#14110b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${fraunces.variable}`}
      // THEME_INIT_SCRIPT sets data-theme/color-scheme before paint, so the
      // server HTML cannot match on first render. Suppress only that check.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
