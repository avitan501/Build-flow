import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Avantia Build",
    short_name: "Avantia Build",
    description: "Get construction materials priced and delivered to your jobsite.",
    id: "/",
    start_url: "/admin/build-map",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f5f7fa",
    theme_color: "#071126",
    icons: [
      {
        src: "/images/avantia/avantia-app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
