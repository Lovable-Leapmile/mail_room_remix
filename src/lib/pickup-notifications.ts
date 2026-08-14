import { useEffect, useState } from "react";
import { PODCORE_BASE, apiHeaders } from "./api-config";
import { useMailroom } from "./mailroom";

export interface PickupNotification {
  id: number;
  reservation_type: string;
  pod_name: string;
  pickup_otp: string;
  updated_at: string;
}

export function usePickupNotifications(): PickupNotification[] {
  const phone = useMailroom((s) => s.user?.regNo);
  const [items, setItems] = useState<PickupNotification[]>([]);

  useEffect(() => {
    if (!phone) {
      setItems([]);
      return;
    }
    let cancel = false;
    const url = `${PODCORE_BASE}/reservations/?status=active&reservation_status=PickupPending&pickupby_phone=${encodeURIComponent(
      phone,
    )}&order_by_field=updated_at&order_by_type=DESC`;
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
          })),
        );
      })
      .catch(() => {
        if (!cancel) setItems([]);
      });
    return () => {
      cancel = true;
    };
  }, [phone]);

  return items;
}

export function formatPickupBody(n: PickupNotification): string {
  return `${n.reservation_type} parcel is in ${n.pod_name}.\nPickup OTP is ${n.pickup_otp}.`;
}
