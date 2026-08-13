// Dummy data layer for Leapmile Digital Mailroom prototype.
// Uses localStorage + in-memory to simulate persistence.

export type ParcelStatus =
  | "Pending Registration"
  | "Awaiting Deposit"
  | "Pending Drop"
  | "Dropped"
  | "Stored in Smart Locker"
  | "Stored in Cube Robot"
  | "Ready for Pickup"
  | "Pickup Scheduled"
  | "Collected"
  | "Out for Delivery"
  | "Delivered"
  | "Expired"
  | "Cancelled"
  | "Failed Verification";

export type StorageType = "locker" | "robot";
export type Direction = "incoming" | "outgoing";

export interface Parcel {
  id: string;
  trackingId: string;
  sender: string;
  receiver: string;
  courier: string;
  storageType: StorageType;
  storageId: string; // e.g. "BLR - A001" or "CUBE ROBOT - 1"
  status: ParcelStatus;
  otp: string;
  otpValidUntil: string; // ISO
  createdAt: string;
  updatedAt: string;
  pickupDeadline: string;
  direction: Direction;
  size: "Small" | "Medium" | "Large";
  weight: string;
  notes?: string;
  audit: { at: string; status: ParcelStatus; actor: string }[];
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  kind: "parcel" | "system" | "admin";
  parcelId?: string;
}

const KEY = "leapmile.state.v4";

const COURIERS = ["BlueDart", "DHL", "FedEx", "Delhivery", "Ekart", "DTDC"];
const NAMES = ["Aarav Sharma", "Priya Menon", "Rohan Kapoor", "Isha Verma", "Kabir Rao", "Ananya Iyer", "Vihaan Patel", "Meera Nair"];
const SENDERS = ["Amazon India", "Apple Store", "Myntra", "Croma", "Flipkart", "Meesho", "Tata Cliq", "Ajio", "Reliance Digital"];

function rid(prefix: string) { return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`; }
function otp() { return Math.floor(100000 + Math.random() * 900000).toString(); }
function isoOffset(hours: number) { return new Date(Date.now() + hours * 3600_000).toISOString(); }

function seed(): { parcels: Parcel[]; notifications: AppNotification[] } {
  const now = new Date();
  const parcels: Parcel[] = [
    {
      id: rid("P"), trackingId: "BLR" + Math.floor(Math.random() * 1e9),
      sender: "Amazon India", receiver: "You", courier: "BlueDart",
      storageType: "locker", storageId: "BLR - A001",
      status: "Ready for Pickup", otp: "482913", otpValidUntil: isoOffset(6),
      createdAt: isoOffset(-2), updatedAt: isoOffset(-0.5),
      pickupDeadline: isoOffset(24), direction: "incoming",
      size: "Medium", weight: "1.2 kg",
      audit: [
        { at: isoOffset(-2), status: "Stored in Smart Locker", actor: "Courier · Rakesh" },
        { at: isoOffset(-0.5), status: "Ready for Pickup", actor: "System" },
      ],
    },
    {
      id: rid("P"), trackingId: "DHL" + Math.floor(Math.random() * 1e9),
      sender: "Apple Store", receiver: "You", courier: "DHL",
      storageType: "robot", storageId: "CUBE ROBOT - 1",
      status: "Ready for Pickup", otp: "731502", otpValidUntil: isoOffset(10),
      createdAt: isoOffset(-6), updatedAt: isoOffset(-1),
      pickupDeadline: isoOffset(36), direction: "incoming",
      size: "Small", weight: "0.4 kg",
      audit: [
        { at: isoOffset(-5), status: "Stored in Cube Robot", actor: "Courier · Anita" },
        { at: isoOffset(-1), status: "Ready for Pickup", actor: "System" },
      ],
    },
    // (Outgoing parcels are created only when the employee books a shipment.)
    {
      id: rid("P"), trackingId: "EKT" + Math.floor(Math.random() * 1e9),
      sender: "Flipkart", receiver: "You", courier: "Ekart",
      storageType: "locker", storageId: "BLR - A002",
      status: "Collected", otp: "918273", otpValidUntil: isoOffset(-2),
      createdAt: isoOffset(-72), updatedAt: isoOffset(-40),
      pickupDeadline: isoOffset(-24), direction: "incoming",
      size: "Large", weight: "3.4 kg",
      audit: [
        { at: isoOffset(-70), status: "Stored in Smart Locker", actor: "Courier · Sameer" },
        { at: isoOffset(-48), status: "Ready for Pickup", actor: "System" },
        { at: isoOffset(-40), status: "Collected", actor: "You" },
      ],
    },
    // Courier pending drops — parcels the courier still needs to drop into a locker or cube
    {
      id: rid("P"), trackingId: "BLR" + Math.floor(Math.random() * 1e9),
      sender: "Myntra", receiver: "Priya Menon", courier: "BlueDart",
      storageType: "locker", storageId: "—",
      status: "Pending Drop", otp: "", otpValidUntil: isoOffset(0),
      createdAt: isoOffset(-1), updatedAt: isoOffset(-0.2),
      pickupDeadline: isoOffset(24), direction: "incoming",
      size: "Small", weight: "0.5 kg",
      audit: [{ at: isoOffset(-1), status: "Pending Drop", actor: "Hub · Bengaluru" }],
    },
    {
      id: rid("P"), trackingId: "BLR" + Math.floor(Math.random() * 1e9),
      sender: "Croma", receiver: "Rohan Kapoor", courier: "BlueDart",
      storageType: "robot", storageId: "—",
      status: "Pending Drop", otp: "", otpValidUntil: isoOffset(0),
      createdAt: isoOffset(-1.2), updatedAt: isoOffset(-0.3),
      pickupDeadline: isoOffset(24), direction: "incoming",
      size: "Medium", weight: "1.6 kg",
      audit: [{ at: isoOffset(-1.2), status: "Pending Drop", actor: "Hub · Bengaluru" }],
    },
    {
      id: rid("P"), trackingId: "BLR" + Math.floor(Math.random() * 1e9),
      sender: "Meesho", receiver: "Isha Verma", courier: "BlueDart",
      storageType: "locker", storageId: "—",
      status: "Pending Drop", otp: "", otpValidUntil: isoOffset(0),
      createdAt: isoOffset(-0.8), updatedAt: isoOffset(-0.1),
      pickupDeadline: isoOffset(24), direction: "incoming",
      size: "Small", weight: "0.3 kg",
      audit: [{ at: isoOffset(-0.8), status: "Pending Drop", actor: "Hub · Bengaluru" }],
    },
  ];
  void now; void NAMES;
  const notifications: AppNotification[] = [
    { id: rid("N"), title: "Parcel ready for pickup", body: "BlueDart parcel is in Locker BLR - A001. OTP valid 6h.", at: isoOffset(-0.5), read: false, kind: "parcel", parcelId: parcels[0].id },
    { id: rid("N"), title: "New parcel stored", body: "Apple Store parcel placed in CUBE ROBOT - 1.", at: isoOffset(-1), read: false, kind: "parcel", parcelId: parcels[1].id },
    { id: rid("N"), title: "Admin: Organization approved", body: "Your Leapmile HQ account is active.", at: isoOffset(-24), read: true, kind: "admin" },
  ];
  return { parcels, notifications };
}


export interface State {
  parcels: Parcel[];
  notifications: AppNotification[];
  user: { name: string; email: string; org: string; role: string; regNo: string; avatar: string } | null;
  loggedIn: boolean;
}

function load(): State {
  if (typeof window === "undefined") return { ...seed(), user: null, loggedIn: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const s: State = {
    ...seed(),
    user: { name: "Arjun Malhotra", email: "arjun.m@leapmile.com", org: "Leapmile HQ · Bengaluru", role: "Employee", regNo: "1234567890", avatar: "AM" },
    loggedIn: false,
  };
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

export const CREDENTIALS = {
  employee: { regNo: "1234567890", password: "567890", user: { name: "Arjun Malhotra", email: "arjun.m@leapmile.com", org: "Leapmile HQ · Bengaluru", role: "Employee", regNo: "1234567890", avatar: "AM" } },
  courier: { regNo: "1234567899", password: "567890", user: { name: "Rakesh Kumar", email: "rakesh.k@bluedart.com", org: "BlueDart · Bengaluru Hub", role: "Courier", regNo: "1234567899", avatar: "RK" } },
} as const;

import { PODCORE_BASE, apiHeaders } from "./api-config";
const API_BASE = PODCORE_BASE;

export type DetectedRole = "employee" | "courier";

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "U";
}

export async function lookupUserType(phone: string): Promise<{ role: DetectedRole; raw: any } | null> {
  if (!/^\d{10}$/.test(phone)) return null;
  try {
    const res = await fetch(`${API_BASE}/users/?user_phone=${encodeURIComponent(phone)}&order_by_field=updated_at&order_by_type=DESC`, { headers: apiHeaders });
    if (!res.ok) return null;
    const data = await res.json();
    const list = Array.isArray(data) ? data : data?.records || data?.data || data?.users || data?.results || [];
    const u = list[0];
    if (!u) return null;
    const type = String(u.user_type || "").toLowerCase();
    if (type === "customer") return { role: "employee", raw: u };
    if (type === "delivery") return { role: "courier", raw: u };
    return null;
  } catch {
    return null;
  }
}

export async function signIn(phone: string, otpText: string): Promise<DetectedRole | null> {
  try {
    const res = await fetch(`${API_BASE}/otp/validate_otp/?user_phone=${encodeURIComponent(phone)}&otp_text=${encodeURIComponent(otpText)}`, { headers: apiHeaders });
    if (!res.ok) {
      console.error("validate_otp failed", res.status);
      return null;
    }
    const data = await res.json();
    const msg = String(data?.message || "").toLowerCase();
    if (!msg.includes("validation success")) {
      console.warn("validate_otp response", data);
      return null;
    }

    const lookup = await lookupUserType(phone);
    const role: DetectedRole = lookup?.role ?? "employee";
    const u = lookup?.raw || {};
    const name = u.user_name || u.name || u.full_name || (role === "courier" ? "Courier User" : "Employee User");
    const email = u.user_email || u.email || "";
    const org = u.organization_name || u.org || u.company_name || (role === "courier" ? "Courier Partner" : "Leapmile HQ · Bengaluru");
    const roleLabel = role === "courier" ? "Courier" : "Employee";
    setState({ loggedIn: true, user: { name, email, org, role: roleLabel, regNo: phone, avatar: initials(name) } });
    return role;
  } catch (e) {
    console.error("signIn error", e);
    return null;
  }
}

const listeners = new Set<() => void>();
let state: State = load();

export function getState() { return state; }
export function setState(next: Partial<State> | ((s: State) => Partial<State>)) {
  const patch = typeof next === "function" ? next(state) : next;
  state = { ...state, ...patch };
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}
export function subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }

import { useSyncExternalStore } from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector";
const getState_ = () => state;
export function useMailroom<T>(selector: (s: State) => T): T {
  return useSyncExternalStoreWithSelector(
    subscribe,
    getState_,
    getState_,
    selector,
  );
}
// Keep unused import referenced to avoid tree-shake warnings
void useSyncExternalStore;

// Helpers
export function updateParcel(id: string, patch: Partial<Parcel>, actor = "System") {
  setState((s) => ({
    parcels: s.parcels.map((p) => {
      if (p.id !== id) return p;
      const audit = patch.status && patch.status !== p.status
        ? [...p.audit, { at: new Date().toISOString(), status: patch.status, actor }]
        : p.audit;
      return { ...p, ...patch, updatedAt: new Date().toISOString(), audit };
    }),
  }));
}

export function addParcel(p: Omit<Parcel, "id" | "createdAt" | "updatedAt" | "audit" | "otp" | "otpValidUntil">): Parcel {
  const now = new Date().toISOString();
  const parcel: Parcel = {
    ...p,
    id: rid("P"),
    otp: otp(),
    otpValidUntil: isoOffset(24),
    createdAt: now,
    updatedAt: now,
    audit: [{ at: now, status: p.status, actor: "You" }],
  };
  setState((s) => ({ parcels: [parcel, ...s.parcels] }));
  pushNotification({ title: "Booking confirmed", body: `Reserved ${p.storageId} for ${p.courier}.`, kind: "system", parcelId: parcel.id });
  return parcel;
}

export function createReservation(input: {
  awb: string;
  receiverName: string;
  receiverPhone: string;
  courier: string;
  storageType?: StorageType;
}): Parcel {
  const now = new Date().toISOString();
  const storageType: StorageType = input.storageType ?? (Math.random() > 0.5 ? "locker" : "robot");
  const storageId = allocateStorage(storageType);
  const parcel: Parcel = {
    id: rid("P"),
    trackingId: input.awb,
    sender: input.courier,
    receiver: input.receiverName,
    courier: input.courier,
    storageType,
    storageId,
    status: "Pending Drop",
    otp: "",
    otpValidUntil: isoOffset(24),
    createdAt: now,
    updatedAt: now,
    pickupDeadline: isoOffset(24),
    direction: "incoming",
    size: "Medium",
    weight: "—",
    notes: input.receiverPhone,
    audit: [{ at: now, status: "Pending Drop", actor: `Reserved by ${input.courier}` }],
  };
  setState((s) => ({ parcels: [parcel, ...s.parcels] }));
  return parcel;
}

export function addDummyParcel(kind: "drop" | "pickup" | "incoming", courierCompany?: string): Parcel {
  const isLocker = Math.random() > 0.5;
  const receiver = NAMES[Math.floor(Math.random() * NAMES.length)];
  const sender = SENDERS[Math.floor(Math.random() * SENDERS.length)];
  const now = new Date().toISOString();
  const company = courierCompany || COURIERS[Math.floor(Math.random() * COURIERS.length)];
  const tracking = (company.slice(0, 3).toUpperCase() || "BLR") + Math.floor(Math.random() * 1e6);
  const size = ["Small", "Medium", "Large"][Math.floor(Math.random() * 3)] as Parcel["size"];
  const weight = `${(0.3 + Math.random() * 2).toFixed(1)} kg`;
  const deadline = new Date(Date.now() + 24 * 3600_000).toISOString();

  if (kind === "drop") {
    const parcel: Parcel = {
      id: rid("P"),
      trackingId: tracking,
      sender,
      receiver,
      courier: company,
      storageType: isLocker ? "locker" : "robot",
      storageId: "—",
      status: "Pending Drop",
      otp: "",
      otpValidUntil: now,
      createdAt: now,
      updatedAt: now,
      pickupDeadline: deadline,
      direction: "incoming",
      size,
      weight,
      audit: [{ at: now, status: "Pending Drop", actor: "Hub · Bengaluru" }],
    };
    setState((s) => ({ parcels: [parcel, ...s.parcels] }));
    return parcel;
  }

  if (kind === "incoming") {
    const storageType = isLocker ? "locker" : "robot";
    const storageId = allocateStorage(storageType);
    const generatedOtp = otp();
    const parcel: Parcel = {
      id: rid("P"),
      trackingId: tracking,
      sender,
      receiver: "You",
      courier: company,
      storageType,
      storageId,
      status: "Ready for Pickup",
      otp: generatedOtp,
      otpValidUntil: isoOffset(24),
      createdAt: now,
      updatedAt: now,
      pickupDeadline: deadline,
      direction: "incoming",
      size,
      weight,
      audit: [
        { at: now, status: storageType === "locker" ? "Stored in Smart Locker" : "Stored in Cube Robot", actor: `${company} · Courier` },
        { at: now, status: "Ready for Pickup", actor: "System" },
      ],
    };
    setState((s) => ({ parcels: [parcel, ...s.parcels] }));
    return parcel;
  }

  const storageType = isLocker ? "locker" : "robot";
  const storageId = allocateStorage(storageType);
  const generatedOtp = otp();
  const employeeSender = NAMES[Math.floor(Math.random() * NAMES.length)];
  const parcel: Parcel = {
    id: rid("P"),
    trackingId: tracking,
    sender: employeeSender,
    receiver: `${company} Pickup`,
    courier: company,
    storageType,
    storageId,
    status: "Ready for Pickup",
    otp: generatedOtp,
    otpValidUntil: isoOffset(24),
    createdAt: now,
    updatedAt: now,
    pickupDeadline: deadline,
    direction: "outgoing",
    size,
    weight,
    audit: [
      { at: now, status: storageType === "locker" ? "Stored in Smart Locker" : "Stored in Cube Robot", actor: employeeSender },
      { at: now, status: "Ready for Pickup", actor: "System" },
    ],
  };
  setState((s) => ({ parcels: [parcel, ...s.parcels] }));
  return parcel;
}

export function pushNotification(n: Omit<AppNotification, "id" | "at" | "read">) {
  const item: AppNotification = { ...n, id: rid("N"), at: new Date().toISOString(), read: false };
  setState((s) => ({ notifications: [item, ...s.notifications] }));
}

export function markAllRead() {
  setState((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
}

export function completeDrop(id: string, storageType: StorageType, actor = "Courier") {
  const storageId = allocateStorage(storageType);
  const generatedOtp = otp();
  setState((s) => ({
    parcels: s.parcels.map((p) => {
      if (p.id !== id) return p;
      const now = new Date().toISOString();
      return {
        ...p,
        storageType,
        storageId,
        otp: generatedOtp,
        otpValidUntil: isoOffset(24),
        status: "Dropped",
        updatedAt: now,
        audit: [
          ...p.audit,
          { at: now, status: storageType === "locker" ? "Stored in Smart Locker" : "Stored in Cube Robot", actor },
          { at: now, status: "Dropped", actor },
          { at: now, status: "Ready for Pickup", actor: "System" },
        ],
      };
    }),
  }));
  return { storageId, otp: generatedOtp };
}



let nextLocker = 3; // BLR - A001 and BLR - A002 are seeded
let nextRobot = 2;  // CUBE ROBOT - 1 is seeded

export function allocateStorage(type: StorageType): string {
  if (type === "locker") {
    const id = `BLR - A${nextLocker.toString().padStart(3, "0")}`;
    nextLocker++;
    return id;
  }
  const id = `CUBE ROBOT - ${nextRobot}`;
  nextRobot++;
  return id;
}

export const COURIER_LIST = COURIERS;
export const EMPLOYEES = NAMES;

export function statusColor(s: ParcelStatus): { bg: string; fg: string; dot: string } {
  switch (s) {
    case "Ready for Pickup":
    case "Stored in Smart Locker":
    case "Stored in Cube Robot":
      return { bg: "bg-[color:var(--primary-soft)]", fg: "text-primary", dot: "bg-primary" };
    case "Collected":
    case "Delivered":
      return { bg: "bg-green-50", fg: "text-green-700", dot: "bg-green-500" };
    case "Dropped":
      return { bg: "bg-green-50", fg: "text-green-700", dot: "bg-green-500" };
    case "Pending Drop":
    case "Out for Delivery":
    case "Pickup Scheduled":
    case "Awaiting Deposit":
    case "Pending Registration":
      return { bg: "bg-amber-50", fg: "text-amber-700", dot: "bg-amber-500" };
    case "Expired":
    case "Cancelled":
    case "Failed Verification":
      return { bg: "bg-red-50", fg: "text-red-700", dot: "bg-red-500" };
  }
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  const diff = (d.getTime() - Date.now()) / 60000;
  const abs = Math.abs(diff);
  const past = diff < 0;
  if (abs < 1) return "just now";
  if (abs < 60) return past ? `${Math.round(abs)}m ago` : `in ${Math.round(abs)}m`;
  const hrs = abs / 60;
  if (hrs < 24) return past ? `${Math.round(hrs)}h ago` : `in ${Math.round(hrs)}h`;
  const days = hrs / 24;
  return past ? `${Math.round(days)}d ago` : `in ${Math.round(days)}d`;
}
