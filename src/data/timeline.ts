import type { TimelineItem } from "../types/timeline";

export const timelineCategories = [
  { id: "all", label: "Todo" },
  { id: "experience", label: "Experiencia" },
];

export const initialTimeline: TimelineItem[] = [
  {
    id: "freelance-actual",
    type: "experience",
    title: "Diseñadora Freelance",
    institution: "Branding y Diseño digital",
    location: "Bogotá, Colombia",
    period: "2022 - Actualidad",
    description:
      "Diseño y maquetación de interfaces y productos digitales para proyectos editoriales, sitios web y piezas gráficas para campañas en redes sociales. Colaboración con emprendedores y autores para resolver retos de comunicación gráfica. Creación de ilustraciones digitales y contenido visual para diversas plataformas.",
  },
  {
    id: "vision-media",
    type: "experience",
    title: "Diseñadora Freelance Partner",
    institution: "Vision Media",
    location: "Bogotá, Colombia",
    period: "Julio, 2025",
    description:
      "Diseño de contenido digital y comunicación visual. Diseño de piezas gráficas para campañas publicitarias y redes sociales. Creación de presentaciones corporativas y material publicitario. Desarrollo y aplicación de identidad visual y manual de marca. Producción de contenido digital con Adobe Creative Cloud, CapCut, Figma y Canva.",
  },
  {
    id: "app-miga",
    type: "experience",
    title: "Diseñadora Junior",
    institution: "Universidad Nacional de Colombia, APP Miga",
    location: "Bogotá, Colombia",
    period: "Marzo, 2025",
    description:
      "Investigación, diseño y prototipado de la app Miga, una app de educación financiera gamificada para jóvenes (14 - 30 años). Aplicación de principios de gamificación (Octalysis), UX/UI, heurísticas de Nielsen, accesibilidad y diseño inclusivo. Realización de research design, test de usabilidad y encuestas para validar el user flow.",
  },
  {
    id: "estudiante-auxiliar",
    type: "experience",
    title: "Estudiante Auxiliar UNAL",
    institution:
      "Universidad Nacional de Colombia, Bienestar FCE - Área de divulgación",
    location: "Bogotá, Colombia",
    period: "Enero, 2021 - Febrero, 2025",
    description:
      "Apoyo en la ejecución de estrategias de comunicación digital, aplicando criterios de diseño accesible para maximizar el alcance en la comunidad universitaria. Diseño multimedia para presentaciones, mejora de la visualización y comunicación de proyectos. Diseño de interfaces y activos digitales para branding, sitios web y campañas en redes sociales.",
  },
  {
    id: "disenadora-junior-2020",
    type: "experience",
    title: "Diseñadora Junior",
    institution: "Diseño de producto y campañas publicitarias",
    location: "Bogotá, Colombia",
    period: "Junio, 2019 - Marzo, 2020",
    description:
      "Diseño multimedia para campañas publicitarias siguiendo los criterios visuales de la identidad de marca. Maquetas y modelos.",
  },
];
