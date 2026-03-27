import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Elden Smash",
    short_name: "Elden Smash",
    description: "Smash or Pass Elden Ring — 450+ characters from the Lands Between",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#ffd700",
    icons: [
      {
        src: "/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
