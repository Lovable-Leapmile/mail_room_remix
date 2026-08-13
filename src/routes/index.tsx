import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "mail room" },
      { name: "description", content: "mail room" },
      { property: "og:title", content: "mail room" },
      { property: "og:description", content: "mail room" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <h1 className="text-2xl font-medium tracking-tight text-foreground">
        mail room
      </h1>
    </div>
  );
}
