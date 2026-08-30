import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Study OS",
    template: "%s | Study OS",
  },
  description:
    "Your personal operating system for Banking and SSC exam preparation. Track study time, revisions, mocks, and progress — all in one place.",
  keywords: [
    "Banking exam preparation",
    "SSC exam preparation",
    "study tracker",
    "revision planner",
    "mock test tracker",
  ],
  authors: [{ name: "Study OS" }],
  robots: { index: false, follow: false }, // private single-user app
};

export const viewport: Viewport = {
  themeColor: "#0d0d14",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
