export interface TimelineItem {
  id: string;
  type: "experience";
  title?: string;
  institution?: string;
  location?: string;
  period?: string;
  description?: string;
  tags?: string[];
  href?: string;
  visible?: boolean;
}
