import type { Metadata } from "next";
import { Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VYBE — Your AI Fashion Stylist",
  description:
    "A digital wardrobe that styles itself. Upload your clothes, pick an occasion, and receive three editorial-quality outfit combinations composed by AI — using only what you own.",
  keywords: ["fashion", "AI stylist", "digital wardrobe", "outfit ideas", "personal styling", "VYBE"],
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%236b2130'/%3E%3Ctext x='16' y='23' font-family='Georgia, serif' font-weight='bold' font-size='19' fill='%23faf6ef' text-anchor='middle'%3EV%3C/text%3E%3C/svg%3E",
  },
  openGraph: {
    title: "VYBE — Your AI Fashion Stylist",
    description: "Three editorial looks from the clothes you already own.",
    siteName: "VYBE",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} ${geistMono.variable} antialiased bg-background text-foreground font-sans`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
