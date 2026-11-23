import { createFileRoute } from "@tanstack/react-router";
import Game from "@/components/game/Game";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reformed City — Eat, Dance, Flirt, Live" },
      { name: "description", content: "A 3D life game in a busy endless city: work, cook jollof, dance amapiano, flirt and get married." },
      { property: "og:title", content: "Reformed City — Eat, Dance, Flirt, Live" },
      { property: "og:description", content: "Live your best life in a busy 3D city." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});
