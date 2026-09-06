import type { MetadataRoute } from 'next';

/**
 * Diario privado: no queremos que aparezca en buscadores.
 * Esto no es una medida de seguridad (un bot malicioso lo ignora), sino
 * higiene. El control real de acceso vive en /api con la cookie de sesion.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
  };
}
