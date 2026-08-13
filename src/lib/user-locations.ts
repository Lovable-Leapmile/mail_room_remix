import { useCallback, useEffect, useState } from "react";
import { PODCORE_BASE, apiHeaders as headers } from "./api-config";

export interface UserLocation {
  location_id: number;
  location_name: string;
  location_address: string;
}

const STORAGE_KEY = "mailroom.selectedLocationId";
const listeners = new Set<() => void>();

export function getSelectedLocationId(): number | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v ? Number(v) : null;
}

export function setSelectedLocationId(id: number) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, String(id));
  listeners.forEach((l) => l());
}

async function fetchRecords(url: string): Promise<any[]> {
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d?.records || [];
}

async function fetchUserId(phone: string): Promise<number | null> {
  const rows = await fetchRecords(
    `${PODCORE_BASE}/users/?user_phone=${encodeURIComponent(phone)}&order_by_field=updated_at&order_by_type=DESC`,
  );
  return rows[0]?.id ?? rows[0]?.user_id ?? null;
}

export async function fetchUserLocations(phone: string): Promise<UserLocation[]> {
  const userId = await fetchUserId(phone);
  if (!userId) return [];
  const rows = await fetchRecords(
    `${PODCORE_BASE}/users/locations/?user_id=${userId}&order_by_field=created_at&order_by_type=DESC`,
  );
  const seen = new Set<number>();
  const out: UserLocation[] = [];
  for (const r of rows) {
    const id = r.location_id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      location_id: id,
      location_name: r.location_name ?? "",
      location_address: r.location_address ?? "",
    });
  }
  return out;
}

export function useUserLocations(phone: string | undefined | null) {
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [selectedId, setId] = useState<number | null>(() => getSelectedLocationId());

  useEffect(() => {
    const l = () => setId(getSelectedLocationId());
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);

  useEffect(() => {
    if (!phone) return;
    let cancel = false;
    fetchUserLocations(phone).then((list) => {
      if (cancel) return;
      setLocations(list);
      const current = getSelectedLocationId();
      if (list.length && !list.some((l) => l.location_id === current)) {
        setSelectedLocationId(list[0].location_id);
      }
    });
    return () => {
      cancel = true;
    };
  }, [phone]);

  const select = useCallback((id: number) => setSelectedLocationId(id), []);
  const selected = locations.find((l) => l.location_id === selectedId) ?? locations[0] ?? null;

  return { locations, selected, selectedId: selected?.location_id ?? null, select };
}

export function formatUserLocation(l: UserLocation | null): string {
  if (!l) return "";
  return [l.location_name, l.location_address].filter(Boolean).join(", ");
}
