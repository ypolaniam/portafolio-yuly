import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Brand } from "../types/brand";
import { initialBrand } from "../data/brand";

export const BRAND_NAME_STORAGE_KEY = "brand:name";

export function cacheBrandName(name: string): void {
  try {
    localStorage.setItem(BRAND_NAME_STORAGE_KEY, name);
  } catch {
    /* almacenamiento no disponible */
  }
}

export function readCachedBrandName(): string | null {
  try {
    return localStorage.getItem(BRAND_NAME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSettingsRef() {
  if (!db) throw new Error("Firebase no inicializado");
  return doc(db, "settings", "cache");
}

export async function getBrandOnce(): Promise<Brand> {
  const snap = await getDoc(getSettingsRef());
  const data = (snap.data() as { brand?: Brand } | undefined);
  return data?.brand ?? initialBrand;
}

export async function setBrand(brand: Brand): Promise<void> {
  await setDoc(getSettingsRef(), { brand }, { merge: true });
  cacheBrandName(brand.name.trim());
}

export async function migrateBrand(): Promise<boolean> {
  const snap = await getDoc(getSettingsRef());
  const data = (snap.data() as { brand?: Brand } | undefined);

  if (data?.brand) {
    console.log("[migrateBrand] brand already exists, skipping");
    return false;
  }

  console.log("[migrateBrand] writing initialBrand to settings/cache");
  await setDoc(getSettingsRef(), { brand: initialBrand }, { merge: true });
  return true;
}
