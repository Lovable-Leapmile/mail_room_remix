import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { PODCORE_BASE, PUBSUB_BASE, apiHeaders } from "@/lib/api-config";
import { fetchDoorState, retrieveTray, isTrayReady, releaseTray, patchDoorStatus } from "@/lib/robot";
import { toast } from "sonner";

type Phase = "starting" | "retrieving" | "waiting-open" | "open" | "waiting-close" | "done";

/** Runs the locker / robot hardware sequence for an already-created reservation. */
export function DropHardware({
  isRobot,
  podId,
  doorNumber,
  onDone,
  onRetrieved,
}: {
  isRobot: boolean;
  podId?: number;
  doorNumber?: number;
  onDone: () => void;
  onRetrieved?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("starting");
  const trayRef = useRef<string | null>(null);
  const startedRef = useRef(false);

  // Kick off the hardware call once (robot: retrieve tray, locker: publish open).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      if (!podId || !doorNumber) {
        toast.error("Storage details missing for this reservation.");
        return;
      }
      if (isRobot) {
        setPhase("retrieving");
        const tray = await fetchDoorState(podId, doorNumber);
        trayRef.current = tray;
        if (!tray) {
          toast.error("Could not read the drop tray for this pod.");
          return;
        }
        await retrieveTray(tray);
      } else {
        setPhase("waiting-open");
        try {
          await fetch(`${PUBSUB_BASE}/publish?topic=${podId}`, {
            method: "POST",
            headers: { ...apiHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ action: "open", door: doorNumber }),
          });
        } catch {
          // Non-fatal — polling still runs.
        }
      }
    })();
  }, [isRobot, podId, doorNumber]);

  // Robot: poll until the tray reaches the station, then open the door.
  useEffect(() => {
    if (phase !== "retrieving" || !podId || !doorNumber) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      const tray = trayRef.current;
      if (!tray) {
        timer = setTimeout(poll, 2000);
        return;
      }
      const ready = await isTrayReady(tray);
      if (cancelled) return;
      if (ready) {
        await patchDoorStatus(podId, doorNumber, "OPEN");
        if (!cancelled) {
          setPhase("open");
          onRetrieved?.();
        }
        return;
      }
      timer = setTimeout(poll, 2000);
    };
    timer = setTimeout(poll, 1500);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [phase, podId, doorNumber, onRetrieved]);

  // Locker: poll PubSub for opened / closed events.
  useEffect(() => {
    if (isRobot) return;
    if (phase !== "waiting-open" && phase !== "waiting-close") return;
    if (!podId || !doorNumber) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const patchStatus = async (status: "OPEN" | "CLOSED") => {
      try {
        await fetch(
          `${PODCORE_BASE}/doors/update_door_status/?door_number=${doorNumber}&pod_id=${podId}&status=${status}`,
          { method: "PATCH", headers: apiHeaders },
        );
      } catch {
        // Non-fatal.
      }
    };

    const poll = async () => {
      try {
        const res = await fetch(`${PUBSUB_BASE}/subscribe?topic=${podId}&num_records=1`, { headers: apiHeaders });
        const data = await res.json();
        if (cancelled) return;
        const records: unknown[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.records)
            ? data.records
            : Array.isArray(data?.data)
              ? data.data
              : [];
        const payload = JSON.stringify(records).toLowerCase();
        if (phase === "waiting-open" && payload.includes("opened")) {
          await patchStatus("OPEN");
          if (!cancelled) {
            setPhase("waiting-close");
            onRetrieved?.();
          }
          return;
        }
        if (phase === "waiting-close" && payload.includes("closed")) {
          await patchStatus("CLOSED");
          if (!cancelled) {
            setPhase("done");
            onDone();
          }
          return;
        }
      } catch {
        // Ignore transient errors; keep polling.
      }
      if (!cancelled) timer = setTimeout(poll, 1000);
    };
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isRobot, phase, podId, doorNumber, onDone, onRetrieved]);

  const confirmDropped = async () => {
    if (podId && doorNumber) {
      if (trayRef.current) await releaseTray(trayRef.current);
      await patchDoorStatus(podId, doorNumber, "CLOSED");
    }
    setPhase("done");
    onDone();
  };

  if (phase === "starting" || phase === "retrieving") {
    return (
      <LoaderStage
        title={isRobot ? "Please wait, your drop tray is retrieving" : "Opening the locker door…"}
        desc={isRobot ? "The Cube Robot is bringing the drop tray to the station." : "Waiting for the locker to open."}
      />
    );
  }
  if (phase === "waiting-open") {
    return <LoaderStage title="Opening the locker door…" desc="Waiting for the locker to open." />;
  }
  if (phase === "open" && isRobot) {
    return (
      <div className="rounded-2xl bg-green-50 p-5 min-h-[240px] flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <p className="mt-3 font-semibold text-sm text-green-700">Door open — drop the parcel</p>
        <p className="mt-1 text-xs text-muted-foreground max-w-[280px]">Place the parcel inside the tray, then confirm below.</p>
        <button onClick={confirmDropped} className="haptic-tap mt-4 px-5 py-2.5 rounded-full brand-gradient text-white text-xs font-semibold">
          I've Dropped the Parcel
        </button>
      </div>
    );
  }
  if (phase === "waiting-close") {
    return (
      <div className="rounded-2xl bg-green-50 p-5 min-h-[240px] flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <p className="mt-3 font-semibold text-sm text-green-700">Door open — drop the parcel</p>
        <p className="mt-1 text-xs text-muted-foreground max-w-[280px]">
          Place the parcel inside and close the door. We'll confirm automatically once it's closed.
        </p>
      </div>
    );
  }
  return (
    <div className="w-full py-8 rounded-2xl bg-green-50 text-green-700 flex flex-col items-center gap-2 animate-pop-in min-h-[240px] justify-center">
      <CheckCircle2 className="w-10 h-10" />
      <p className="font-semibold text-sm">Parcel dropped successfully</p>
      <p className="text-[11px] text-green-700/70">Returning to dashboard...</p>
    </div>
  );
}

function LoaderStage({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl bg-[color:var(--primary-soft)]/50 p-5 min-h-[240px] flex flex-col items-center justify-center text-center">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="mt-4 font-semibold text-sm">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-[280px]">{desc}</p>
    </div>
  );
}
