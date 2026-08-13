export const API_BASE_URL =
  (import.meta.env.VITE_BASE_URL as string) || "https://testpod.leapmile.com";
export const API_TOKEN =
  (import.meta.env.VITE_API_TOKEN as string) || "";
export const PODCORE_BASE = `${API_BASE_URL}/podcore`;
export const PUBSUB_BASE = `${API_BASE_URL}/pubsub`;
export const ROBOT_BASE =
  (import.meta.env.VITE_ROBOT_BASE_URL as string) ||
  "https://magesh.leapmile.com/robotmanager";
export const apiHeaders = {
  accept: "application/json",
  Authorization: `Bearer ${API_TOKEN}`,
};
