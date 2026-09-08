/**
 * Ayudas para servir imagenes al tamanio justo.
 *
 * Antes, un pin de 44px del mapa cargaba la foto original de 4 MB del celular.
 * Cloudinary puede redimensionar en el CDN cambiando la URL, sin re-subir nada.
 */

const CLOUDINARY_UPLOAD_MARKER = '/image/upload/';

type ThumbOptions = {
  width: number;
  height?: number;
  /** 'fill' recorta al cuadro exacto, 'fit' entra completo sin recortar. */
  crop?: 'fill' | 'fit';
};

export function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com') && url.includes(CLOUDINARY_UPLOAD_MARKER);
}

/**
 * Devuelve la misma imagen redimensionada por el CDN.
 * Si la URL no es de Cloudinary la deja intacta.
 */
export function thumbUrl(url: string | undefined, options: ThumbOptions): string {
  if (!url) return '';
  if (!isCloudinaryUrl(url)) return url;

  const { width, height, crop = 'fill' } = options;
  const parts = [
    `c_${crop}`,
    `w_${Math.round(width)}`,
    height ? `h_${Math.round(height)}` : null,
    'q_auto:good',
    'f_auto',
    'dpr_auto',
  ]
    .filter(Boolean)
    .join(',');

  return url.replace(CLOUDINARY_UPLOAD_MARKER, `${CLOUDINARY_UPLOAD_MARKER}${parts}/`);
}

/** Poster de un video de Cloudinary, para no descargar el video en la grilla. */
export function videoPosterUrl(url: string, width = 400): string {
  if (!url.includes('res.cloudinary.com')) return '';
  return url
    .replace('/video/upload/', `/video/upload/c_fill,w_${width},q_auto,f_auto/`)
    .replace(/\.(mp4|mov|webm|m4v)$/i, '.jpg');
}

/** Escapa texto antes de meterlo en HTML crudo (pines del mapa). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Solo deja pasar https y blob:; corta javascript: y data: en atributos src.
 *
 * blob: se permite porque son las previsualizaciones de archivos que la persona
 * acaba de elegir y todavia no se subieron. Las crea nuestro propio codigo con
 * URL.createObjectURL y son del mismo origen: no pueden llegar desde la base,
 * donde la validacion solo acepta https de Cloudinary o Unsplash.
 */
export function safeImageSrc(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('blob:')) return url;
  try {
    const parsed = new URL(url, 'https://invalid.local');
    return parsed.protocol === 'https:' ? url : '';
  } catch {
    return '';
  }
}
