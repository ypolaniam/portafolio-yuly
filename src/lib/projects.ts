import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Project } from "../types/project";
import { initialProjects } from "../data/projects";

function getSettingsRef() {
  if (!db) throw new Error("Firebase no inicializado");
  return doc(db, "settings", "cache");
}

export async function getProjectsOnce(): Promise<Project[]> {
  const snap = await getDoc(getSettingsRef());
  const data = (snap.data() as { projects?: Project[] } | undefined);
  return data?.projects ?? [];
}

export async function upsertProject(project: Project): Promise<void> {
  const projects = await getProjectsOnce();
  const idx = projects.findIndex((p) => p.slug === project.slug);
  const next = { ...project, createdAt: project.createdAt ?? Date.now() };

  if (idx >= 0) {
    projects[idx] = next;
  } else {
    projects.push(next);
  }

  await setDoc(getSettingsRef(), { projects }, { merge: true });
}

export async function removeProject(slug: string): Promise<void> {
  const projects = await getProjectsOnce();
  const next = projects.filter((p) => p.slug !== slug);
  await setDoc(getSettingsRef(), { projects }, { merge: true });
}

export async function migrateProjects(): Promise<number> {
  const projects = await getProjectsOnce();
  const existing = new Set(projects.map((p) => p.slug));

  // Merge (no overwrite): only add seed projects whose slug isn't already present,
  // so existing admin-created/edited projects are never wiped.
  let added = 0;
  for (const p of initialProjects) {
    if (!existing.has(p.slug)) {
      projects.push(p);
      added++;
    }
  }

  await setDoc(getSettingsRef(), { projects }, { merge: true });
  return added;
}
