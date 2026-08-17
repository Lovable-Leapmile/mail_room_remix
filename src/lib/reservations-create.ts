import { useEffect, useState } from "react";
import { PODCORE_BASE, apiHeaders as headers } from "./api-config";

export interface LocationUser {
  user_id: number;
  user_name: string;
  user_phone: string;
  user_type: string;
  user_flatno?: string;
}

export const RESERVATION_TYPES = ["Flipkart", "Amazon", "Myntra", "Snapdeal", "Meesho", "Nykaa"];

export async function fetchLocationUsers(
  locationId: number,
  userType: string = "customer",
): Promise<LocationUser[]> {
  const res = await fetch(
    `${PODCORE_BASE}/users/locations/?location_id=${locationId}&order_by_field=created_at&order_by_type=DESC`,
    { headers },
  );
  if (!res.ok) return [];
  const d = await res.json();
  const rows: any[] = Array.isArray(d) ? d : d?.records || [];
  const seen = new Set<string>();
  const out: LocationUser[] = [];
  for (const r of rows) {
    if (String(r.user_type).toLowerCase() !== userType.toLowerCase()) continue;
    const phone = String(r.user_phone ?? "");
    if (!phone || seen.has(phone)) continue;
    seen.add(phone);
    out.push({
      user_id: r.user_id,
      user_name: r.user_name ?? "",
      user_phone: phone,
      user_type: r.user_type,
      user_flatno: r.user_flatno,
    });
  }
  return out;
}

export function useLocationUsers(
  locationId: number | null | undefined,
  userType: string = "customer",
) {
  const [users, setUsers] = useState<LocationUser[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!locationId) {
      setUsers([]);
      return;
    }
    let cancel = false;
    setLoading(true);
    fetchLocationUsers(locationId, userType)
      .then((u) => !cancel && setUsers(u))
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [locationId, userType]);
  return { users, loading };
}

export async function createReservationApi(input: {
  courierPhone: string;
  pickupPhone: string;
  awb: string;
  reservationType: string;
  podId?: string;
}): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${PODCORE_BASE}/reservations/create`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        created_by_phone: input.courierPhone,
        drop_by_phone: input.courierPhone,
        pickup_by_phone: input.pickupPhone,
        pod_id: input.podId ?? "1111111",
        reservation_awbno: input.awb,
        reservation_type: input.reservationType,
        payment_mode: "cod",
        payment_vendor: "paytm",
        payment_amount: "1.0",
      }),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok || d?.statusbool === false) {
      return { ok: false, message: d?.message || `Failed (${res.status})` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Network error" };
  }
}

export interface LocationPod {
  pod_id: number;
  pod_name: string;
}

export async function fetchLocationPods(locationId: number): Promise<LocationPod[]> {
  const res = await fetch(
    `${PODCORE_BASE}/pods/?location_id=${locationId}&status=active&order_by_field=updated_at&order_by_type=DESC`,
    { headers },
  );
  if (!res.ok) return [];
  const d = await res.json();
  const rows: any[] = Array.isArray(d) ? d : d?.records || [];
  return rows
    .filter((r) => r?.id != null)
    .map((r) => ({ pod_id: r.id, pod_name: r.pod_name ?? String(r.id) }));
}

export function useLocationPods(locationId: number | null | undefined) {
  const [pods, setPods] = useState<LocationPod[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!locationId) {
      setPods([]);
      return;
    }
    let cancel = false;
    setLoading(true);
    fetchLocationPods(locationId)
      .then((p) => !cancel && setPods(p))
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [locationId]);
  return { pods, loading };
}
