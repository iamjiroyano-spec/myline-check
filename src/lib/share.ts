import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  getEffectiveSections,
  loadSection,
  loadMember,
  shiftHistory,
  type Slot,
} from "@/lib/lineCheck";
import { lsStore } from "@/lib/lsStore";

const slotSchema = z.string();

const entrySchema = z.object({
  status: z.string().catch(""),
  note: z.string().catch(""),
  photo: z.string().optional().catch(undefined),
});

const sectionStateSchema = z.object({
  date: z.string().catch(""),
  opening: z.string().catch(""),
  mid: z.string().catch(""),
  closing: z.string().catch(""),
  entries: z.record(z.string(), z.record(z.string(), entrySchema)).catch({}),
});

const summarySchema = z.object({
  date: z.string().catch(""),
  slot: slotSchema,
  member: z.string().catch(""),
  stationsTouched: z.number().int().nonnegative().catch(0),
  stationsComplete: z.number().int().nonnegative().catch(0),
  totalItems: z.number().int().nonnegative().catch(0),
  checkedItems: z.number().int().nonnegative().catch(0),
  flagged: z.number().int().nonnegative().catch(0),
});

export const sharedShiftPayloadSchema = z.object({
  date: z.string().catch(""),
  shift: slotSchema,
  member: z.string().catch(""),
  brand_name: z.string().catch("LUMA"),
  scope: z.enum(["shift", "station"]).optional().catch("shift"),
  station: z.string().optional().catch(undefined),
  summary: summarySchema,
  sections: z
    .array(z.object({ name: z.string(), state: sectionStateSchema }))
    .catch([]),
});

export type SharedShiftPayload = z.infer<typeof sharedShiftPayloadSchema>;

function buildPayload(
  date: string,
  slot: Slot,
  onlyStation?: string,
): SharedShiftPayload {
  const allSections = getEffectiveSections();
  const filtered = onlyStation
    ? allSections.filter((s) => s.name === onlyStation)
    : allSections;
  const sections = filtered.map((s) => ({
    name: s.name,
    state: loadSection(s.name, date),
  }));
  const brand_name = lsStore.getItem("linecheck:settings:brand:name") || "LUMA";
  const fullSummary = shiftHistory(date, slot);
  const summary = onlyStation
    ? (() => {
        const st = fullSummary.stations.find((x) => x.name === onlyStation);
        return {
          date,
          slot,
          member: fullSummary.member,
          stationsTouched: st ? 1 : 0,
          stationsComplete: st?.complete ? 1 : 0,
          totalItems: st?.totalItems ?? 0,
          checkedItems: st?.checkedItems ?? 0,
          flagged: st?.flagged ?? 0,
        };
      })()
    : fullSummary;
  return {
    date,
    shift: slot,
    member: loadMember(date, slot),
    brand_name,
    scope: onlyStation ? "station" : "shift",
    station: onlyStation,
    summary,
    sections,
  };
}

/**
 * Publish the current shift snapshot to the database and return a public URL.
 * Uses upsert on (owner_id, date, shift) so re-sharing keeps the same link.
 * Pass `station` to publish a single-station snapshot with its own stable link.
 */
export async function publishSharedShift(
  date: string,
  slot: Slot,
  station?: string,
): Promise<string> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error("Sign in required to share");
  const owner_id = userData.user.id;
  const payload = buildPayload(date, slot, station);

  // Encode station scope into the shift key so each station gets a stable link
  // distinct from the full-shift share.
  const shiftKey = station ? `${slot}::station::${station}` : slot;

  const { data, error } = await supabase
    .from("shared_shifts")
    .upsert(
      {
        owner_id,
        date,
        shift: shiftKey,
        member: payload.member || null,
        brand_name: payload.brand_name,
        payload: JSON.parse(JSON.stringify(payload)),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id,date,shift" },
    )
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Failed to publish share");
  return `${window.location.origin}/s/${data.id}`;
}
