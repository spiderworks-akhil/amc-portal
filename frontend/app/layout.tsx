import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Geist_Mono, Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});
const geistMono = Geist_Mono({subsets:['latin'],variable:'--font-geist-mono'});

export const metadata: Metadata = {
  title: "AMC Portal",
  description: "Project Management Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full antialiased font-sans", "font-sans", inter.variable, geistMono.variable)}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
