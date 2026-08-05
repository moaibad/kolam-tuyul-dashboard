import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: "600",
});

export const metadata: Metadata = {
  title: "Position Tracker | KolamTuyul",
  description:
    "Track concentrated-liquidity positions across Krystal chains and protocols without connecting a wallet.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      {
        url: "/brand/kolam-tuyul-icon.png",
        type: "image/png",
        sizes: "512x512",
      },
      {
        url: "/brand/kolam-tuyul-logo.avif",
        type: "image/avif",
        sizes: "640x640",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} dark h-full antialiased`}
    >
      <body className="min-h-full">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
