import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { About } from "../types/about";
import { initialAbout } from "../data/about";

function getSettingsRef() {
  if (!db) throw new Error("Firebase no inicializado");
  return doc(db, "settings", "cache");
}

export async function getAboutOnce(): Promise<About> {
  const snap = await getDoc(getSettingsRef());
  const data = (snap.data() as { about?: About } | undefined);
  return data?.about ?? initialAbout;
}

export async function setAbout(about: About): Promise<void> {
  await setDoc(getSettingsRef(), { about }, { merge: true });
}

export async function migrateAbout(): Promise<boolean> {
  const snap = await getDoc(getSettingsRef());
  const data = (snap.data() as { about?: About } | undefined);

  if (data?.about) {
    console.log("[migrateAbout] about already exists, skipping");
    return false;
  }

  console.log("[migrateAbout] writing initialAbout to settings/cache");
  await setDoc(getSettingsRef(), { about: initialAbout }, { merge: true });
  return true;
}
