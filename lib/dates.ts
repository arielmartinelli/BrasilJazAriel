/**
 * Fechas sin sorpresas de zona horaria.
 *
 * `new Date('2026-03-05')` se interpreta como UTC medianoche, que en Argentina
 * (UTC-3) es el 4 de marzo a las 21:00. Eso hacia que una tarjeta mostrara un
 * dia y el orden cronologico usara otro. Construimos la fecha en hora local.
 */

export function parseMemoryDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return new Date(NaN);
  return new Date(year, month - 1, day);
}

export function formatMemoryDate(
  isoDate: string,
  style: 'short' | 'long' = 'short'
): string {
  const date = parseMemoryDate(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    year: 'numeric',
  });
}

/** "marzo 2026", para los encabezados de la linea de tiempo. */
export function formatMonthLabel(isoDate: string): string {
  const date = parseMemoryDate(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const label = date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function daysBetween(fromIso: string, to: Date = new Date()): number {
  const from = parseMemoryDate(fromIso);
  if (Number.isNaN(from.getTime())) return 0;
  const diff = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}
