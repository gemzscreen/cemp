import type { Metadata, Viewport } from "next";
import "./globals.css";
import SwRegister from "@/components/SwRegister";

export const metadata: Metadata = {
  title: { default: "CEMP Web App", template: "%s · CEMP" },
  description: "Civil Engineering practices library: Codes, Tools, Conversions, Practices, Education.",
  appleWebApp: { capable: true, title: "CEMP", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1e2b3c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}<SwRegister /></body>
    </html>
  );
}
