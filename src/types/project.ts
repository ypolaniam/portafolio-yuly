export interface Project {
  slug: string;
  title: string;
  category: string;
  image: string;
  description: string;
  metrics?: string | string[];
  tools?: string[];
  year: string;
  size?: "large" | "medium" | "small";
  // Visibility toggle. `undefined` / `true` => visible; `false` => hidden from the public site.
  visible?: boolean;
  // Extra images shown in a gallery on the public detail page.
  gallery?: string[];
}

export type CardMode = "display" | "edit";
