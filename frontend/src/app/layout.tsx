import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://promptr.dev";

export const metadata: Metadata = {
  title: {
    default: "Promptr — Generate AI coding prompts from your app idea",
    template: "%s | Promptr",
  },
  description:
    "Describe your app idea and Promptr's multi-agent AI pipeline generates precise, sequential development prompts you can use with any AI coding tool.",
  keywords: [
    "AI prompts",
    "coding assistant",
    "app development",
    "prompt engineering",
    "AI code generation",
    "developer tools",
  ],
  authors: [{ name: "Promptr" }],
  creator: "Promptr",
  metadataBase: new URL(siteUrl),

  // Open Graph — Facebook, LinkedIn, Discord, Slack, iMessage, etc.
  openGraph: {
    type: "website",
    siteName: "Promptr",
    title: "Promptr — Generate AI coding prompts from your app idea",
    description:
      "Describe your app idea and Promptr's multi-agent AI pipeline generates precise, sequential development prompts you can use with any AI coding tool.",
    url: siteUrl,
    images: [
      {
        url: "/fullLogo.png",
        width: 513,
        height: 230,
        alt: "Promptr logo",
      },
    ],
    locale: "en_US",
  },

  // Twitter / X card
  twitter: {
    card: "summary_large_image",
    title: "Promptr — Generate AI coding prompts from your app idea",
    description:
      "Describe your app idea and get precise, sequential development prompts for any AI coding tool.",
    images: ["/fullLogo.png"],
  },

  // Icons
  icons: {
    icon: "/favicon.ico",
    apple: "/Logo.png",
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
