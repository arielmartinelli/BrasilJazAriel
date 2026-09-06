import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),

  {
    rules: {
      /**
       * Decisión consciente: las fotos se sirven con <img> y no con next/image.
       *
       * Cloudinary ya redimensiona y convierte a WebP/AVIF en su CDN mediante
       * transformaciones en la URL (ver lib/media.ts). Pasarlas otra vez por el
       * optimizador de Next duplicaría el trabajo, consumiría cuota de Vercel
       * y no mejoraría el resultado. Cada <img> lleva width/height, loading y
       * decoding explícitos, que es lo que la regla busca evitar perder.
       */
      '@next/next/no-img-element': 'off',
    },
  },
]);

export default eslintConfig;
