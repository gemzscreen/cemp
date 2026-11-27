import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import SwRegister from "@/components/SwRegister";

export const metadata: Metadata = {
  title: { default: "CEMP: Construction Estimating and Management Platform", template: "%s · CEMP" },
  description: "CEMP: Construction Estimating and Management Platform. Estimating, design checks, site practices and an engineering reference library.",
  appleWebApp: { capable: true, title: "CEMP", statusBarStyle: "black-translucent" },
  icons: { icon: [{ url: "/icons/logo.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1e2b3c" };

// Night mode (v2.8.0): runs before paint so a dark page never flashes white. "auto" follows the OS setting.
const THEME_JS = `(function(){try{var m=localStorage.getItem("cemp-theme")||"auto",d=m==="dark"||(m==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";document.documentElement.dataset.mode=m;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_JS }} /></head>
      <body>{children}<SwRegister /></body>
    </html>
  );
}
