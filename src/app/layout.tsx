import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { env } from "@/lib/env";
import { themeScript } from "@/components/theme-toggle";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-theme",
  display: "swap",
});

const siteUrl = env.siteUrl();
const title = "PipelinePrep - DevOps practice & interview prep";
const description =
  "Topic-wise DevOps quizzes, real-world incident scenarios and interview prep. Instant feedback with detailed explanations. Built by an AWS and DevOps practitioner.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s | PipelinePrep",
  },
  description,
  applicationName: "PipelinePrep",
  keywords: [
    "DevOps practice",
    "AWS quiz",
    "Kubernetes interview questions",
    "Terraform practice",
    "DevOps scenarios",
    "Linux troubleshooting",
    "DevOps interview prep",
    "CNCF CKA practice",
  ],
  authors: [{ name: "PipelinePrep" }],
  creator: "PipelinePrep",
  publisher: "PipelinePrep",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "PipelinePrep",
    title,
    description,
    url: siteUrl,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#060910",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en-IN"
      className={`${inter.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the stored theme before first paint so there is no flash of
            the wrong palette. Must stay inline and synchronous. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
