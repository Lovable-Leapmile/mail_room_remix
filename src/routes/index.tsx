import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("leapmile.state.v1");
        if (raw && JSON.parse(raw).loggedIn) throw redirect({ to: "/dashboard" });
      } catch (e) {
        if (e && typeof e === "object" && "to" in e) throw e;
      }
    }
    throw redirect({ to: "/login" });
  },
});
