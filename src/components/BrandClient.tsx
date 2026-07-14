import { useEffect } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Brand } from "../types/brand";
import { initialBrand } from "../data/brand";
import { cacheBrandName } from "../lib/brand";

function applyBrand(name: string) {
  document.querySelectorAll<HTMLElement>("[data-brand-name]").forEach((el) => {
    el.textContent = name;
  });
  document.querySelectorAll<HTMLElement>("[data-brand-name-full]").forEach((el) => {
    el.textContent = `${name}`;
  });
}

export default function BrandClient() {
  useEffect(() => {
    if (!db) {
      applyBrand(initialBrand.name);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "settings", "cache"),
      (snap) => {
        const data = (snap.data() as { brand?: Brand } | undefined);
        const name = data?.brand?.name?.trim() || initialBrand.name;
        cacheBrandName(name);
        applyBrand(name);
      },
      (err) => {
        console.error("[BrandClient] onSnapshot error:", err);
        applyBrand(initialBrand.name);
      },
    );
    return () => unsub();
  }, []);

  return null;
}
