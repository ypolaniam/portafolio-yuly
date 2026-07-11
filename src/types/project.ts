export interface Project {
  slug: string;
  title: string;
  category: string;
  image: string;
  description: string;
  metrics?: string;
  tools?: string[];
  year: string;
  size?: "large" | "medium" | "small";
}

export type CardMode = "display" | "edit";
