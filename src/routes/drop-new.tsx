import { createFileRoute } from "@tanstack/react-router";
import { DropFlow } from "@/components/mailroom/DropFlow";

export const Route = createFileRoute("/drop-new")({
  head: () => ({
    meta: [
      { title: "New Drop · Leapmile" },
      { name: "description", content: "Locate the device, scan it and create the parcel reservation before dropping." },
      { property: "og:title", content: "New Drop · Leapmile" },
      { property: "og:description", content: "Locate the device, scan it and create the parcel reservation before dropping." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <DropFlow title="Drop Parcel" />,
});
