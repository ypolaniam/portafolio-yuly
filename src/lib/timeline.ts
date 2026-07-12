import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { TimelineItem } from "../types/timeline";
import { initialTimeline } from "../data/timeline";

function getSettingsRef() {
  if (!db) throw new Error("Firebase no inicializado");
  return doc(db, "settings", "cache");
}

export async function getTimelineOnce(): Promise<TimelineItem[]> {
  const snap = await getDoc(getSettingsRef());
  const data = (snap.data() as { timeline?: TimelineItem[] } | undefined);
  return data?.timeline ?? [];
}

export async function setTimeline(items: TimelineItem[]): Promise<void> {
  await setDoc(getSettingsRef(), { timeline: items }, { merge: true });
}

export async function migrateTimeline(): Promise<number> {
  const snap = await getDoc(getSettingsRef());
  const data = (snap.data() as { timeline?: TimelineItem[] } | undefined);
  const existing = new Set((data?.timeline ?? []).map((item) => item.id));

  let added = 0;
  const next = [...(data?.timeline ?? [])];

  for (const item of initialTimeline) {
    if (!existing.has(item.id)) {
      next.push(item);
      added++;
    }
  }

  if (added > 0) {
    console.log(`[migrateTimeline] writing ${added} new items to settings/cache`);
    await setDoc(getSettingsRef(), { timeline: next }, { merge: true });
  } else {
    console.log("[migrateTimeline] all items already exist, skipping");
  }
  return added;
}

export async function reorderTimeline(ordered: TimelineItem[]): Promise<void> {
  await setDoc(getSettingsRef(), { timeline: ordered }, { merge: true });
}

export async function upsertTimelineItem(item: TimelineItem): Promise<void> {
  const items = await getTimelineOnce();
  const idx = items.findIndex((i) => i.id === item.id);

  if (idx >= 0) {
    items[idx] = item;
  } else {
    items.push(item);
  }

  await setDoc(getSettingsRef(), { timeline: items }, { merge: true });
}

export async function removeTimelineItem(id: string): Promise<void> {
  const items = await getTimelineOnce();
  const next = items.filter((i) => i.id !== id);
  await setDoc(getSettingsRef(), { timeline: next }, { merge: true });
}

export async function setTimelineItemVisibility(id: string, visible: boolean): Promise<void> {
  const items = await getTimelineOnce();
  const next = items.map((item) =>
    item.id === id ? { ...item, visible } : item
  );
  await setDoc(getSettingsRef(), { timeline: next }, { merge: true });
}
