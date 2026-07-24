import data from "@/data/lineCheck.json";
import { lsStore, getUserScope } from "@/lib/lsStore";


export type Slot = "op" | "mid" | "cl";
export type Entry = { status: string; note: string };
export type SectionState = {
  date: string;
  opening: string;
  mid: string;
  closing: string;
  entries: Record<string, Record<Slot, Entry>>;
};

export const STATUSES = data.statuses;
export const STAFF = data.staff;
export const SECTIONS = data.sections.filter((s) => s.items.length > 0);

export type SectionDef = { name: string; items: { name: string }[] };

/** Returns the effective list of stations, honoring user additions/renames
 *  stored under `linecheck:settings:stations`. Falls back to the shipped
 *  JSON structure when no override exists. */
export function getEffectiveSections(): SectionDef[] {
  try {
    const raw = lsStore.getItem("linecheck:settings:stations");
    if (raw) {
      const arr = JSON.parse(raw) as Array<{ name: string; items?: { name: string }[] }>;
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.map((s) => ({
          name: s.name,
          items: Array.isArray(s.items) ? s.items : [],
        }));
      }
    }
  } catch {}
  return SECTIONS;
}

/** Returns the effective items for a section, honoring user category edits
 *  stored under `linecheck:section-items:<name>`. Falls back to the station
 *  items configured in Settings, then the shipped JSON structure. */
export function effectiveItems(sectionName: string): { name: string }[] {
  return effectiveCategorizedItems(sectionName).flatMap((c) => c.items);
}

/** Returns the effective items grouped by category for a section. */
export function effectiveCategorizedItems(
  sectionName: string,
): { group: string; items: { name: string }[] }[] {
  try {
    const raw = lsStore.getItem(`linecheck:section-items:${sectionName}`);
    if (raw) {
      const cats = JSON.parse(raw) as { group?: string; items: { name: string }[] }[];
      if (Array.isArray(cats)) {
        return cats.map((c, i) => ({
          group: c.group ?? `Group ${i + 1}`,
          items: Array.isArray(c.items) ? c.items : [],
        }));
      }
    }
  } catch {}
  const fromSettings = getEffectiveSections().find((s) => s.name === sectionName);
  if (fromSettings) return [{ group: sectionName, items: fromSettings.items }];
  const sec = data.sections.find((s) => s.name === sectionName);
  return sec ? [{ group: sectionName, items: sec.items }] : [];
}

/** Compound entry key so items with the same display name in different
 *  categories don't share status. */
export function entryKey(group: string, itemName: string) {
  return `${group}::${itemName}`;
}

/** Reads an entry using the compound key, falling back to the legacy
 *  bare-name key for previously-saved data. */
export function readEntry(
  state: SectionState,
  group: string,
  itemName: string,
  slot: Slot,
): Entry | undefined {
  return (
    state.entries[entryKey(group, itemName)]?.[slot] ??
    state.entries[itemName]?.[slot]
  );
}

export const FLAG_STATUSES = new Set([
  "ABOUT TO EXPIRE",
  "EXPIRED",
  "NEED TO CLEAN",
  "WRONG LABEL",
]);
export const OK_STATUSES = new Set(["OK", "N/A", "F/O", "PREPPING"]);

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function storageKey(name: string, date = todayISO()) {
  return `linecheck:${name}:${date}`;
}

export function emptyEntry(): Entry {
  return { status: "", note: "" };
}

export function memberKey(date: string, slot: Slot) {
  return `linecheck:member:${slot}:${date}`;
}
export function loadMember(date: string, slot: Slot): string {
  try {
    return lsStore.getItem(memberKey(date, slot)) || "";
  } catch {
    return "";
  }
}
export function saveMember(date: string, slot: Slot, name: string) {
  try {
    if (name) lsStore.setItem(memberKey(date, slot), name);
    else lsStore.removeItem(memberKey(date, slot));
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("linecheck:update"));
  } catch {}
}

export type ShiftHistory = {
  date: string;
  slot: Slot;
  member: string;
  stationsTouched: number;
  stationsComplete: number;
  flagged: number;
  totalItems: number;
  checkedItems: number;
};

export function shiftHistory(date: string, slot: Slot): ShiftHistory {
  let stationsTouched = 0;
  let stationsComplete = 0;
  let flagged = 0;
  let totalItems = 0;
  let checkedItems = 0;
  for (const sec of getEffectiveSections()) {
    const state = loadSection(sec.name, date);
    const cats = effectiveCategorizedItems(sec.name);
    let anyTouched = false;
    let allDone = true;
    let secTotal = 0;
    for (const cat of cats) {
      for (const item of cat.items) {
        totalItems++;
        secTotal++;
        const e = readEntry(state, cat.group, item.name, slot);
        if (e?.status) {
          anyTouched = true;
          checkedItems++;
          if (FLAG_STATUSES.has(e.status)) flagged++;
        } else {
          allDone = false;
        }
      }
    }
    if (anyTouched) stationsTouched++;
    if (anyTouched && allDone && secTotal > 0) stationsComplete++;
  }
  return {
    date,
    slot,
    member: loadMember(date, slot),
    stationsTouched,
    stationsComplete,
    flagged,
    totalItems,
    checkedItems,
  };
}

export const SLOT_LABEL: Record<Slot, string> = {
  op: "Opening",
  mid: "Mid",
  cl: "Closing",
};

export function loadSection(name: string, date = todayISO()): SectionState {
  try {
    const raw = lsStore.getItem(storageKey(name, date));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { date, opening: "", mid: "", closing: "", entries: {} };
}

export function defaultShift(): Slot {
  const h = new Date().getHours();
  if (h < 11) return "op";
  if (h < 17) return "mid";
  return "cl";
}

export function sectionProgress(name: string, slot: Slot, date = todayISO()) {
  const state = loadSection(name, date);
  const cats = effectiveCategorizedItems(name);
  let done = 0;
  let flagged = 0;
  let total = 0;
  for (const cat of cats) {
    for (const item of cat.items) {
      total++;
      const e = readEntry(state, cat.group, item.name, slot);
      if (e?.status) done++;
      if (e?.status && FLAG_STATUSES.has(e.status)) flagged++;
    }
  }
  return { done, total, flagged };
}

export type FlaggedRow = {
  section: string;
  item: string;
  status: string;
  slot: Slot;
};

export function allFlagged(slot: Slot, date = todayISO()): FlaggedRow[] {
  const rows: FlaggedRow[] = [];
  for (const sec of getEffectiveSections()) {
    const state = loadSection(sec.name, date);
    for (const item of effectiveItems(sec.name)) {
      const e = state.entries[item.name]?.[slot];
      if (e?.status && FLAG_STATUSES.has(e.status)) {
        rows.push({ section: sec.name, item: item.name, status: e.status, slot });
      }
    }
  }
  return rows;
}

export type DayHistory = {
  date: string;
  stationsTouched: number;
  stationsComplete: number;
  flagged: number;
  totalItems: number;
  checkedItems: number;
};

export function listHistoryDates(): string[] {
  const dates = new Set<string>();
  // Touch scope so the function re-runs when scope changes elsewhere
  void getUserScope();
  try {
    for (const k of lsStore.keys()) {
      if (!k.startsWith("linecheck:")) continue;
      const parts = k.split(":");
      const d = parts[parts.length - 1];
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) dates.add(d);
    }
  } catch {}
  return [...dates].sort((a, b) => (a < b ? 1 : -1));
}

/** Delete all recorded line-check data (per-shift member selections and
 *  per-section entries) for the current user scope. Settings (stations, staff,
 *  statuses, shelves, containers, branding) are preserved. */
export function clearAllHistory(): number {
  let removed = 0;
  try {
    for (const k of lsStore.keys()) {
      if (!k.startsWith("linecheck:")) continue;
      if (k.startsWith("linecheck:settings:")) continue;
      lsStore.removeItem(k);
      removed++;
    }
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("linecheck:update"));
  } catch {}
  return removed;
}

export function dayHistory(date: string): DayHistory {
  let stationsTouched = 0;
  let stationsComplete = 0;
  let flagged = 0;
  let totalItems = 0;
  let checkedItems = 0;
  for (const sec of getEffectiveSections()) {
    const state = loadSection(sec.name, date);
    const items = effectiveItems(sec.name);
    let anyTouched = false;
    let allDone = true;
    for (const item of items) {
      totalItems++;
      const slots: Slot[] = ["op", "mid", "cl"];
      let itemDoneAnyShift = false;
      for (const slot of slots) {
        const e = state.entries[item.name]?.[slot];
        if (e?.status) {
          anyTouched = true;
          itemDoneAnyShift = true;
          if (FLAG_STATUSES.has(e.status)) flagged++;
        }
      }
      if (itemDoneAnyShift) checkedItems++;
      else allDone = false;
    }
    if (anyTouched) stationsTouched++;
    if (anyTouched && allDone && items.length > 0) stationsComplete++;
  }
  return { date, stationsTouched, stationsComplete, flagged, totalItems, checkedItems };
}
