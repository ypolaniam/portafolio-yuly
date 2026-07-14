import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  integrations: [react()],
  viewTransitions: true,
  // prerenderEnvironment: 'node' evita que el build corra getStaticPaths dentro de
  // Miniflare (workerd), que requiere los bindings SESSION/IMAGES de Cloudflare.
  // El sitio usa Firebase, no esas funciones, así que prerenderizamos en Node
  // (igual que el build estático puro) y el Worker sirve los HTML vía el binding ASSETS.
  adapter: cloudflare({ prerenderEnvironment: 'node' }),
});
