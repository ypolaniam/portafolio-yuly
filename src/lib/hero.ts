import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Hero } from "../types/hero";
import { initialHero } from "../data/hero";

function getSettingsRef() {
  if (!db) throw new Error("Firebase no inicializado");
  return doc(db, "settings", "cache");
}

export async function getHeroOnce(): Promise<Hero> {
  const snap = await getDoc(getSettingsRef());
  const data = (snap.data() as { hero?: Hero } | undefined);
  return data?.hero ?? initialHero;
}

export async function setHero(hero: Hero): Promise<void> {
  await setDoc(getSettingsRef(), { hero }, { merge: true });
}

export async function migrateHero(): Promise<boolean> {
  const snap = await getDoc(getSettingsRef());
  const data = (snap.data() as { hero?: Hero } | undefined);

  if (data?.hero) {
    console.log("[migrateHero] hero already exists, skipping");
    return false;
  }

  console.log("[migrateHero] writing initialHero to settings/cache");
  await setDoc(getSettingsRef(), { hero: initialHero }, { merge: true });
  return true;
}
