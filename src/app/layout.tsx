import type { Metadata } from "next";
import { Bodoni_Moda, Manrope } from "next/font/google";
import { MotionConfig } from "framer-motion";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

const bodoni = Bodoni_Moda({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WLimports — Perfumes Importados",
  description:
    "Curadoria de perfumes importados originais e decants de nicho. Exclusividade, autenticidade garantida e envio seguro — a WLimports leva a alta perfumaria até você.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${bodoni.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <MotionConfig reducedMotion="user">
          <SmoothScroll>{children}</SmoothScroll>
        </MotionConfig>
      </body>
    </html>
  );
}
