import { createFileRoute } from "@tanstack/react-router";
import { DropFlow } from "@/components/mailroom/DropFlow";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Send Parcel · Leapmile" },
      { name: "description", content: "Locate the device, scan it and create the reservation before sending your parcel." },
      { property: "og:title", content: "Send Parcel · Leapmile" },
      { property: "og:description", content: "Locate the device, scan it and create the reservation before sending your parcel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <DropFlow title="Send Parcel" />,
});
