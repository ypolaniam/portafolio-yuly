# Guía completa: Portafolio de diseño 100% gratis con IA

Stack final: **Kilo Code** (VS Code) + modelos gratis + **Astro + React islands** + **Firebase (Auth/Firestore)** + **Cloudinary** + **Cloudflare Pages**

> Nota: se descartó Decap/Sveltia CMS (requería OAuth con Cloudflare Worker). En su lugar, construimos un panel admin propio con la misma cara del sitio — más simple y sin esa fricción.

---

## FASE 0 — Cuentas y herramientas (todo gratis, sin tarjeta)

1. **GitHub** (github.com) — código + hosting.
2. **Node.js LTS** (nodejs.org).
3. **VS Code** + extensión **Kilo Code**.
4. **Google AI Studio** (aistudio.google.com) → API key gratis (Gemini 2.5/2.0 Flash) — modelo principal.
5. **OpenRouter** (openrouter.ai) → API key gratis (modelos `:free`) — respaldo.
6. **Groq** (groq.com) → API key gratis — respaldo/velocidad.
7. **Firebase** (console.firebase.google.com) → nuevo proyecto, plan **Spark** (gratis, sin tarjeta).
8. **Cloudinary** (cloudinary.com) → cuenta free (25GB, sin tarjeta).
9. **Web3Forms** (web3forms.com) → genera un access key con solo tu email, sin cuenta compleja (para el formulario de contacto, Fase 10.6).

### Configurar Kilo Code con varios proveedores
Settings → Providers → agrega perfiles: Google AI Studio (principal), OpenRouter (respaldo 1), Groq (respaldo 2). Cambias de perfil cuando uno te dé error 429.

> ⚠️ **xAI/Grok**: descartado — ya no tiene free tier real, exige crédito prepago.
> ⚠️ **Cursor free**: muy limitado, no lo uses como motor principal.

---

## FASE 1 — Crear el proyecto Astro

```bash
npm create astro@latest portafolio
cd portafolio
npm install
npx astro add react
npm run dev
```

`npx astro add react` configura automáticamente `astro.config.mjs`:
```js
import react from "@astrojs/react";

export default defineConfig({
  integrations: [react()],
});
```

---

## FASE 2 — Prompt inicial a Kilo Code (modo Architect)

```
Voy a construir mi portafolio de diseño con Astro + React islands. Especificaciones:

MARCA:
- Nombre: [tu nombre]
- Paleta: [colores hex]
- Tipografía: [fuente]
- Tono visual: [minimalista / brutalista / editorial / etc.]

ESTRUCTURA:
- Hero, Grid de proyectos, Sobre mí, Contacto

ARQUITECTURA DE DATOS:
- Los proyectos NO son estáticos: viven en Firestore (colección "projects")
- El componente ProjectCard debe ser React (.tsx), reutilizable en dos modos:
  - "display": solo lectura, para el sitio público
  - "edit": con botones de editar/eliminar, para el panel admin
- Las imágenes se suben a Cloudinary (unsigned upload preset)

ANIMACIONES:
- Scroll reveal con la librería "motion"
- Transiciones de página con View Transitions de Astro

Dame primero la arquitectura de carpetas y componentes, sin código todavía.
```

Luego, en modo **Code**, genera por partes: `Layout.astro`, `Header.astro`, `Hero.astro`, `ProjectCard.tsx`, `ProjectsGrid.astro` (que monta `ProjectCard` con `client:load`), `About.astro`, `Contact.astro`, `Footer.astro`.

---

## FASE 3 — Firebase: Auth + Firestore

### 3.1 Crear el proyecto
En Firebase Console → Crear proyecto → plan Spark (gratis) → activa:
- **Authentication** → método Email/Password → crea tu único usuario (tú).
- **Firestore Database** → modo producción → región cercana (ej. `us-central`).

### 3.2 Reglas de seguridad de Firestore
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{id} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == "TU_UID_AQUI";
    }
  }
}
```
Obtén tu UID en Authentication → Users, después de crear tu cuenta.

### 3.3 Config del SDK
En Configuración del proyecto → tus apps → agregar app Web. Copia el objeto `firebaseConfig` (esto es público, no es secreto — la seguridad la dan las reglas de arriba, no ocultar esto).

---

## FASE 4 — Cloudinary: subida de imágenes

1. Dashboard de Cloudinary → copia tu **Cloud Name**.
2. Settings → Upload → Add upload preset → modo **Unsigned** → guarda el nombre del preset.
3. Esto permite subir imágenes directo desde el navegador (panel admin) sin backend ni secretos expuestos.

> Borrado de imágenes (decisión tomada — **Opción A**): el botón "eliminar" en el panel solo borra el documento en Firestore (deja de mostrarse en el portafolio). La imagen queda huérfana en Cloudinary; con 25GB gratis no es un problema para un portafolio personal. Cada tanto puedes limpiar manualmente desde la consola de Cloudinary si quieres.

---

## FASE 5 — Variables de entorno

Crea `.env` en la raíz (Astro ya lo ignora en `.gitignore` por defecto):
```
PUBLIC_FIREBASE_API_KEY=xxxx
PUBLIC_FIREBASE_AUTH_DOMAIN=xxxx
PUBLIC_FIREBASE_PROJECT_ID=xxxx
PUBLIC_FIREBASE_STORAGE_BUCKET=xxxx
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxxx
PUBLIC_FIREBASE_APP_ID=xxxx
PUBLIC_CLOUDINARY_CLOUD_NAME=xxxx
PUBLIC_CLOUDINARY_UPLOAD_PRESET=xxxx
```
Uso en código: `import.meta.env.PUBLIC_FIREBASE_API_KEY`. El prefijo `PUBLIC_` es obligatorio en Astro para variables usadas en el navegador.

> Nota sobre credenciales: todo lo de arriba es seguro de exponer (son identificadores, no contraseñas). El único secreto real que existiría (API Secret de Cloudinary para borrado firmado) **no se usa** en esta arquitectura — evitado a propósito con la Opción A.

---

## FASE 6 — El frontend: leer datos de Firestore

`ProjectCard.tsx` en modo "display" y `ProjectsGrid` consumen Firestore así (pídeselo a Kilo Code con este contexto):

```tsx
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

// dentro del componente:
useEffect(() => {
  const unsub = onSnapshot(collection(db, "projects"), (snap) => {
    setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
  return unsub;
}, []);
```

Se monta en la página Astro con `client:load` (necesita JS en el navegador desde el inicio, ya que los datos no vienen del build).

---

## FASE 7 — Panel admin oculto

### 7.1 Ruta no enlazada
Crea la página en una ruta que no aparezca en ningún menú ni sitemap, ej: `src/pages/admin/index.astro` (usa un slug propio, no “login” obvio). Nadie la encuentra por navegación normal; solo quien tenga el link directo.

```astro
---
// src/pages/admin/index.astro
import AdminPanel from '../../components/AdminPanel.tsx';
import Layout from '../../layouts/Layout.astro';
---
<Layout title="Panel">
  <AdminPanel client:only="react" />
</Layout>
```

### 7.2 Qué contiene `AdminPanel.tsx`
- **Login** con Firebase Auth (email/password) — pantalla previa, nada se muestra sin sesión.
- **Grid de proyectos** reutilizando `ProjectCard` en modo `edit` (mismos estilos del front, con overlay de editar/eliminar en hover).
- **Botón "+" flotante** → abre formulario/modal: título, categoría, imagen (con botón "Subir" que llama a Cloudinary), descripción, link, video (URL de YouTube/Vimeo).
- CRUD contra Firestore: `addDoc`, `updateDoc`, `deleteDoc` en la colección `projects`.

### 7.3 Prompt para Kilo Code
```
Crea AdminPanel.tsx en React para mi portafolio Astro:
- Pantalla de login con Firebase Auth (email/password); si no hay sesión, no
  renderiza nada más.
- Grid reutilizando ProjectCard.tsx en modo "edit" (botones de editar/
  eliminar superpuestos en hover).
- Botón flotante "+" que abre un modal con formulario: título, categoría,
  imagen (input file → sube a Cloudinary con unsigned preset → guarda la
  URL devuelta), descripción, link, video (input de texto para URL de
  YouTube/Vimeo).
- CRUD completo contra Firestore, colección "projects", con onSnapshot
  para reflejar cambios en tiempo real.
- "Eliminar" solo borra el documento de Firestore (no toca Cloudinary).
- Usa la misma paleta, tipografía y componentes del sitio público —debe
  sentirse como una extensión natural del diseño, no un panel genérico.
```

Nota extra de discreción: aunque la URL sea difícil de adivinar, no es seguridad real por sí sola — la protección efectiva es el login de Firebase Auth. La ruta oculta es solo para que no aparezca a simple vista navegando el sitio.

---

## FASE 8 — Despliegue a Cloudflare Pages

Se eligió Cloudflare Pages sobre GitHub Pages por dos razones: URL más limpia (`tuportafolio.pages.dev`, sin el nombre del repo en la ruta) y ancho de banda ilimitado de verdad. Además, Cloudflare hace el build automáticamente — **no necesitas GitHub Actions para esto**.

### 8.1 Conectar el repo
1. Sube tu proyecto a un repositorio de GitHub (público o privado, gratis).
2. Cuenta gratis en **dash.cloudflare.com** → Workers & Pages → Create → Pages → Connect to Git.
3. Selecciona tu repositorio `portafolio`.
4. Configuración de build:
   - **Framework preset**: Astro
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`

### 8.2 Variables de entorno
En la misma pantalla de configuración (o después en Settings → Environment variables), agrega las mismas `PUBLIC_...` que ya tienes en tu `.env` local:
```
PUBLIC_FIREBASE_API_KEY
PUBLIC_FIREBASE_AUTH_DOMAIN
PUBLIC_FIREBASE_PROJECT_ID
PUBLIC_FIREBASE_STORAGE_BUCKET
PUBLIC_FIREBASE_MESSAGING_SENDER_ID
PUBLIC_FIREBASE_APP_ID
PUBLIC_CLOUDINARY_CLOUD_NAME
PUBLIC_CLOUDINARY_UPLOAD_PRESET
```

### 8.3 Deploy
Guarda y despliega. Cloudflare te da la URL al instante: `https://portafolio.pages.dev`. Desde ahora, **cada `git push` a `main` dispara un build y deploy automático**, sin workflows que mantener.

`astro.config.mjs` — ya no necesitas `base`, porque no vives dentro de una subruta de repo:
```js
export default defineConfig({
  site: "https://portafolio.pages.dev",
  integrations: [react()],
});
```

### 8.4 Dominio propio (cuando quieras)
En Custom domains dentro del proyecto de Cloudflare Pages, puedes conectar un dominio real en cualquier momento, gratis — solo pagarías el registro del dominio en sí (~10-15 USD/año), no el hosting.

---

## FASE 9 — Flujo de trabajo diario

  - **Agregar/editar/quitar proyectos**: entras a `portafolio.pages.dev/admin`, inicias sesión, usas los botones. Cambia en Firestore al instante — **no hace falta redeploy**, se ve en vivo porque el front lee Firestore en el navegador.
- **Cambios de diseño/estructura**: vuelves a VS Code + Kilo Code, pides el ajuste, `git push` → Cloudflare Pages detecta el cambio y hace build/deploy automático en ~1 minuto.

---

## FASE 10 — Mejoras finales

### 10.1 SEO / Open Graph
En `Layout.astro`, agrega por página (usando props): `<title>`, `<meta name="description">`, `<meta property="og:title">`, `<meta property="og:description">`, `<meta property="og:image">`. La imagen OG puede ser una captura de tu Hero subida a Cloudinary. Esto controla cómo se ve el link cuando lo compartas en LinkedIn.

Prompt para Kilo Code:
```
Agrega a Layout.astro un sistema de meta tags dinámico (title, description,
og:title, og:description, og:image) que reciba props desde cada página,
con valores por defecto razonables si no se pasan.
```

### 10.2 Analytics
**Cloudflare Web Analytics** (gratis, sin cookies, sin banner de consentimiento necesario): en el dashboard de tu proyecto en Cloudflare Pages → Analytics → Enable Web Analytics. Te da un snippet de un `<script>` para pegar en `Layout.astro`. Cero configuración adicional, cero costo.

### 10.3 Favicon y manifest
Genera un favicon simple (puedes pedirle a Kilo Code un ícono SVG basado en tu marca, o usar un generador gratis tipo realfavicongenerator.net) y un `manifest.json` básico en `public/`. Detalle de pulido, bajo esfuerzo.

### 10.4 Transformaciones de Cloudinary (optimización de imágenes)
En vez de usar la URL de Cloudinary tal cual, agrega parámetros de transformación automática:
```
https://res.cloudinary.com/TU_CLOUD/image/upload/f_auto,q_auto,w_800/mi-imagen.jpg
```
- `f_auto`: sirve el mejor formato según el navegador (WebP/AVIF cuando aplica)
- `q_auto`: comprime sin pérdida visible
- `w_800`: ajusta el ancho (puedes tener variantes por breakpoint)

Pídele a Kilo Code que cree una función helper `getOptimizedImageUrl(url, width)` que aplique esto automáticamente en `ProjectCard` y en las páginas de detalle.

### 10.5 Botón de descarga de CV (opcional, mostrar/ocultar)
Sube tu CV en PDF a Cloudinary. Agrega un campo en la configuración del sitio (puede ser un documento en Firestore, ej. `settings/general` con `{ showCvButton: true, cvUrl: "..." }`), así lo activas/desactivas desde tu propio panel admin sin tocar código — coherente con el resto de la arquitectura.

### 10.6 Formulario de contacto real (Web3Forms)
Gratis, sin backend, sin límite mensual duro, con protección anti-spam (hCaptcha) incluida gratis. Reemplaza el simple "mailto" por un formulario funcional:
```html
<form action="https://api.web3forms.com/submit" method="POST">
  <input type="hidden" name="access_key" value="TU_ACCESS_KEY" />
  <input type="text" name="name" required />
  <input type="email" name="email" required />
  <textarea name="message" required></textarea>
  <button type="submit">Enviar</button>
</form>
```
Importante: este formulario llama directo a Web3Forms, **no** escribe en Firestore — así no necesitas abrir ninguna regla de escritura pública en tu base de datos.

### 10.7 Nota sobre skeleton loaders (no es necesario en tu caso)
Como ya tienes animación de intro y las secciones cargan progresivamente con scroll (lazy load), el "salto" que un skeleton resolvería probablemente ya está cubierto por ese mismo efecto — la carga se siente parte de la coreografía, no como una pantalla vacía inesperada. Déjalo como pendiente con asterisco: si al probar en dispositivos reales notas un parpadeo o vacío antes de que aparezca el contenido, ahí sí vale la pena agregar un estado de carga puntual solo en esa sección. No lo agregues preventivamente.

---

## Resumen de credenciales: qué es público y qué no

| Dato | ¿Es secreto? | Dónde vive |
|---|---|---|
| Firebase config (apiKey, projectId, etc.) | No — identificador, no contraseña | `.env` local / Variables de entorno en Cloudflare Pages (por orden, no por seguridad) |
| Cloudinary cloud name + unsigned preset | No | Igual que arriba |
| Web3Forms access key | No es sensible, pero evita publicarla en foros públicos | Igual que arriba |
| Reglas de Firestore (`request.auth.uid`) | — | Esto es lo que da la seguridad real |
| Tu contraseña de Firebase Auth | Sí | Solo en tu cabeza |
| Cloudinary API Secret | Sí, pero **no se usa** en esta arquitectura | No aplica (evitado con Opción A) |

---

## Límites gratuitos (referencia)

| Servicio | Límite | Uso en este proyecto |
|---|---|---|
| Firestore (Spark) | 1GB, 50K lecturas/día, 20K escrituras/día | Sobra por años |
| Cloudinary free | 25GB almacenamiento/transferencia | Sobra para imágenes de portafolio |
| Google AI Studio | Cuota diaria generosa | Modelo principal en Kilo Code |
| OpenRouter free | 20 req/min, 50-1000/día | Respaldo |
| Cloudflare Pages | Sin límite de tiempo, ancho de banda ilimitado, 500 builds/mes | Hosting final |
| Web3Forms | ~250 envíos/mes en el plan free | Formulario de contacto |

> ⚠️ Nota: Firebase **Storage** (no Firestore) dejó de estar en el plan gratuito Spark en 2026 — por eso usamos Cloudinary para imágenes en vez de Firebase Storage.
