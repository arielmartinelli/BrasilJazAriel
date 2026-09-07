import { z } from 'zod';

/**
 * Esquemas de validacion compartidos entre cliente y servidor.
 * El servidor NUNCA confia en lo que manda el navegador: todo lo que entra
 * por /api pasa por aca antes de tocar la base de datos.
 */

export const STAGE_IDS = ['01-viaje', '02-mudanza', '03-hogar', '04-descubriendo', '05-vida'] as const;
export const AUTHORS = ['Ariel', 'Jazmin'] as const;
export const PARTICIPANTS = ['Ariel', 'Jazmin', 'Bruno'] as const;

/** Solo http(s) y solo hosts que servimos nosotros. Corta javascript: y data: */
const ALLOWED_MEDIA_HOSTS = [
  'res.cloudinary.com',
  'images.unsplash.com',
];

export const safeMediaUrl = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') return false;
      return ALLOWED_MEDIA_HOSTS.some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
      );
    } catch {
      return false;
    }
  }, 'La URL debe ser https y de Cloudinary o Unsplash');

export const mediaItemSchema = z.object({
  id: z.string().trim().min(1).max(64),
  url: safeMediaUrl,
  type: z.enum(['image', 'video', 'audio']),
  caption: z.string().trim().max(300).optional(),
  durationSeconds: z.number().min(0).max(36000).optional(),
});

export const memoryInputSchema = z.object({
  title: z.string().trim().min(1, 'El titulo es obligatorio').max(140),
  description: z.string().trim().max(4000).default(''),
  // Fecha ISO simple, sin hora, y dentro de un rango razonable.
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha invalido')
    .refine((value) => {
      const time = Date.parse(`${value}T00:00:00Z`);
      if (Number.isNaN(time)) return false;
      const year = Number(value.slice(0, 4));
      return year >= 2000 && year <= 2100;
    }, 'Fecha fuera de rango'),
  locationName: z.string().trim().min(1, 'La ubicacion es obligatoria').max(180),
  coordinates: z.tuple([
    z.number().min(-180).max(180), // longitud
    z.number().min(-90).max(90),   // latitud
  ]),
  stageId: z.enum(STAGE_IDS),
  createdBy: z.enum(AUTHORS),
  participants: z.array(z.enum(PARTICIPANTS)).min(1).max(3),
  media: z.array(mediaItemSchema).max(40, 'Maximo 40 archivos por recuerdo').default([]),
  highlight: z.boolean().optional().default(false),
});

export const memoryUpdateSchema = memoryInputSchema.extend({
  id: z.string().trim().min(1).max(64),
});

export type MemoryInput = z.infer<typeof memoryInputSchema>;

/** Aplana los errores de zod a un solo mensaje legible en espanol. */
export function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Datos invalidos';
  const path = issue.path.join('.');
  return path ? `${path}: ${issue.message}` : issue.message;
}
