import { PODCORE_BASE, apiHeaders } from "@/lib/api-config";

/** All robot-manager calls go through our server proxy to avoid CORS. */
const PROXY = "/api/public/robot";

/** Fetch the door record for a pod/door and return its door_state (tray id). */
export async function fetchDoorState(podId: number, doorNo: number): Promise<string | null> {
  try {
    const res = await fetch(`${PODCORE_BASE}/doors/?pod_id=${podId}&door_no=${doorNo}`, {
      headers: apiHeaders,
    });
    const data = await res.json();
    const records: any[] = Array.isArray(data?.records)
      ? data.records
      : Array.isArray(data)
        ? data
        : [];
    const state = records[0]?.door_state;
    return state ? String(state) : null;
  } catch {
    return null;
  }
}

/** Ask the robot manager to bring the tray to the station. */
export async function retrieveTray(trayId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${PROXY}?action=retrieve_tray&tray_id=${encodeURIComponent(trayId)}&required_tags=station`,
      { method: "POST" },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Returns true once the tray has arrived at the station (404 = not yet). */
export async function isTrayReady(trayId: string): Promise<boolean> {
  try {
    const res = await fetch(`${PROXY}?action=is_tray_ready&tray_id=${encodeURIComponent(trayId)}`);
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    if (data && typeof data === "object") {
      if (data.status_code && Number(data.status_code) !== 200) return false;
      if (typeof data.status === "string" && data.status.toLowerCase() === "failure") return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Release the tray back into storage once the user is done at the station. */
export async function releaseTray(trayId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${PROXY}?action=release_tray&tray_id=${encodeURIComponent(trayId)}`,
      { method: "PATCH" },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function patchDoorStatus(
  podId: number,
  doorNumber: number,
  status: "OPEN" | "CLOSED",
): Promise<void> {
  try {
    await fetch(
      `${PODCORE_BASE}/doors/update_door_status/?door_number=${doorNumber}&pod_id=${podId}&status=${status}`,
      { method: "PATCH", headers: apiHeaders },
    );
  } catch {
    // Non-fatal.
  }
}
