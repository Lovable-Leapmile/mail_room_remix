import { useEffect, useState } from "react";
import { PODCORE_BASE, apiHeaders } from "./api-config";

export interface PickupHistoryItem {
  id: number;
  reservation_type: string;
  pod_name: string;
  pickup_otp: string;
  updated_at: string;
  created_at: string;
  pickupby_phone?: string;
  pickupby_name?: string;
  dropby_name?: string;
  courier_name?: string;
  awb_number?: string;
}

export function usePickupHistory(phone?: string, refreshKey = 0): {
  items: PickupHistoryItem[];
  loading: boolean;
} {
  const [items, setItems] = useState<PickupHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    const params = new URLSearchParams({
      reservation_status: "PickupCompleted",
      order_by_field: "updated_at",
      order_by_type: "DESC",
    });
    if (phone) params.set("pickupby_phone", phone);
    const url = `${PODCORE_BASE}/reservations/?${params.toString()}`;
    fetch(url, { headers: apiHeaders })
      .then((r) => r.json())
      .then((d) => {
        if (cancel) return;
        const rows: any[] = Array.isArray(d?.records) ? d.records : [];
        setItems(
          rows.map((r) => ({
            id: r.id,
            reservation_type: r.reservation_type ?? "Parcel",
            pod_name: r.pod_name ?? "—",
            pickup_otp: r.pickup_otp ?? "",
            updated_at: r.updated_at ?? "",
            created_at: r.created_at ?? "",
            pickupby_phone: r.pickupby_phone,
            pickupby_name: r.pickupby_name,
            dropby_name: r.dropby_name,
            courier_name: r.courier_name,
            awb_number: r.awb_number,
          })),
        );
        setLoading(false);
      })
      .catch(() => {
        if (cancel) return;
        setItems([]);
        setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [phone, refreshKey]);

  return { items, loading };
}
