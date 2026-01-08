import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "@/components/ui/toaster";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "InvoWise | Create Professional Invoices Instantly",
    template: "%s | InvoWise",
  },
  description: "InvoWise is a free, fast invoice generator for freelancers and businesses. Create invoices, track payments, and export PDFs in minutes.",
  metadataBase: new URL("https://invowise-invoice.vercel.app"),
  alternates: {
    canonical: "https://invowise-invoice.vercel.app",
  },
  keywords: [
    "invoice generator",
    "create invoices online",
    "invoice software",
    "free invoice tool",
    "recurring invoices",
    "invoice templates",
    "small business invoicing",
  ],
  openGraph: {
    type: "website",
    url: "https://invowise-invoice.vercel.app",
    title: "InvoWise | Create Professional Invoices Instantly",
    description: "Generate professional invoices, track payments, and export PDFs in minutes with InvoWise.",
    siteName: "InvoWise",
    images: [
      {
        url: "https://invowise-invoice.vercel.app/InvoWiseLogo.png",
        width: 1200,
        height: 630,
        alt: "InvoWise Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "InvoWise | Create Professional Invoices Instantly",
    description: "Generate professional invoices, track payments, and export PDFs in minutes with InvoWise.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script
          id="ld-json-org"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "InvoWise",
              url: "https://invowise-invoice.vercel.app",
              logo: "https://invowise-invoice.vercel.app/InvoWiseLogo.png",
              sameAs: [],
              description:
                "InvoWise is a free invoice generator for freelancers and businesses to create professional invoices, track payments, and export PDFs in minutes.",
            }),
          }}
        />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
