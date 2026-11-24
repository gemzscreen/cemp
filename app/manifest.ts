import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CEMP: Construction Estimating and Management Platform",
    short_name: "CEMP",
    description: "Estimating, design checks, site practices and an engineering reference library in one place.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7fa",
    theme_color: "#1e2b3c",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
