import { useEffect, useState } from "react";
import { PODCORE_BASE, apiHeaders as headers } from "./api-config";

const API_BASE = PODCORE_BASE;

export interface LocationInfo {
  location_id: number;
  location_name: string;
  location_address: string;
}

const locationCache = new Map<number, Promise<LocationInfo | null>>();
const userLocationCache = new Map<string, Promise<LocationInfo | null>>();
const podLocationCache = new Map<number, Promise<LocationInfo | null>>();

async function fetchRecords(url: string): Promise<any[]> {
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : d?.records || d?.data || d?.results || [];
}

export function fetchLocationById(locationId: number): Promise<LocationInfo | null> {
  if (!locationId) return Promise.resolve(null);
  if (locationCache.has(locationId)) return locationCache.get(locationId)!;
  const p = (async () => {
    const rows = await fetchRecords(
      `${API_BASE}/locations/?record_id=${locationId}&order_by_field=updated_at&order_by_type=DESC`,
    );
    const r = rows[0];
    if (!r) return null;
    return {
      location_id: r.id ?? locationId,
      location_name: r.location_name ?? "",
      location_address: r.location_address ?? "",
    } as LocationInfo;
  })().catch(() => null);
  locationCache.set(locationId, p);
  return p;
}

async function fetchUserId(phone: string): Promise<number | null> {
  const rows = await fetchRecords(
    `${API_BASE}/users/?user_phone=${encodeURIComponent(phone)}&order_by_field=updated_at&order_by_type=DESC`,
  );
  const r = rows[0];
  return r?.id ?? r?.user_id ?? null;
}

export function fetchUserLocation(phone: string): Promise<LocationInfo | null> {
  if (!phone) return Promise.resolve(null);
  if (userLocationCache.has(phone)) return userLocationCache.get(phone)!;
  const p = (async () => {
    const userId = await fetchUserId(phone);
    if (!userId) return null;
    const rows = await fetchRecords(
      `${API_BASE}/users/locations/?user_id=${userId}&order_by_field=updated_at&order_by_type=DESC`,
    );
    const locId = rows[0]?.location_id;
    if (!locId) return null;
    return fetchLocationById(locId);
  })().catch(() => null);
  userLocationCache.set(phone, p);
  return p;
}

export function fetchPodLocation(podId: number): Promise<LocationInfo | null> {
  if (!podId) return Promise.resolve(null);
  if (podLocationCache.has(podId)) return podLocationCache.get(podId)!;
  const p = (async () => {
    const rows = await fetchRecords(
      `${API_BASE}/pods/?record_id=${podId}&order_by_field=updated_at&order_by_type=DESC`,
    );
    const locId = rows[0]?.location_id;
    if (!locId) return null;
    return fetchLocationById(locId);
  })().catch(() => null);
  podLocationCache.set(podId, p);
  return p;
}

export function useUserLocation(phone: string | undefined | null): LocationInfo | null {
  const [loc, setLoc] = useState<LocationInfo | null>(null);
  useEffect(() => {
    if (!phone) return;
    let cancel = false;
    fetchUserLocation(phone).then((l) => {
      if (!cancel) setLoc(l);
    });
    return () => {
      cancel = true;
    };
  }, [phone]);
  return loc;
}

export function usePodLocation(podId: number | undefined | null): LocationInfo | null {
  const [loc, setLoc] = useState<LocationInfo | null>(null);
  useEffect(() => {
    if (!podId) return;
    let cancel = false;
    fetchPodLocation(podId).then((l) => {
      if (!cancel) setLoc(l);
    });
    return () => {
      cancel = true;
    };
  }, [podId]);
  return loc;
}

export function formatLocation(l: LocationInfo | null): string {
  if (!l) return "";
  return [l.location_name, l.location_address].filter(Boolean).join(", ");
}
