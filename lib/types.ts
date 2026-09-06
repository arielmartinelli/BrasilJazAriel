export type Participant = 'Ariel' | 'Jazmin' | 'Bruno';

export type StageId = '01-viaje' | '02-mudanza' | '03-hogar' | '04-descubriendo' | '05-vida';

export type StageIconName = 'car' | 'package' | 'home' | 'palmtree' | 'heart';

export interface Stage {
  id: StageId;
  order: number;
  title: string;
  subtitle: string;
  iconName: StageIconName;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
}

export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  caption?: string;
}

export interface Memory {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  locationName: string;
  coordinates: [number, number]; // [lng, lat]
  stageId: StageId;
  createdBy: 'Ariel' | 'Jazmin';
  participants: Participant[];
  media: MediaItem[];
  highlight?: boolean;
  createdAt?: string;
}

export const STAGES: Stage[] = [
  {
    id: '01-viaje',
    order: 1,
    title: 'El viaje',
    subtitle: 'Argentina a Brasil en auto',
    iconName: 'car',
    color: '#0284c7',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
    description: 'Auto cargado, mates en la ruta, cruce de frontera y la travesía hacia Brasil con Bruno.',
  },
  {
    id: '02-mudanza',
    order: 2,
    title: 'La mudanza',
    subtitle: 'Primeros días y trámites',
    iconName: 'package',
    color: '#ea580c',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-700',
    badgeBorder: 'border-orange-200',
    description: 'Alojamiento temporal, Bruno adaptándose, compras iniciales y trámites.',
  },
  {
    id: '03-hogar',
    order: 3,
    title: 'Nuestro nuevo hogar',
    subtitle: 'Instalación definitiva',
    iconName: 'home',
    color: '#059669',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-200',
    description: 'Elegir el lugar, armar cada rincón, la cama de Bruno y hacer propia la casa.',
  },
  {
    id: '04-descubriendo',
    order: 4,
    title: 'Descubriendo Brasil',
    subtitle: 'Playas, senderos y sabores',
    iconName: 'palmtree',
    color: '#d97706',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    description: 'Playas paradisíacas, gastronomía local, senderos y nuevos lugares.',
  },
  {
    id: '05-vida',
    order: 5,
    title: 'Nuestra vida acá',
    subtitle: 'Cotidianeidad y recuerdos',
    iconName: 'heart',
    color: '#e11d48',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
    description: 'Mates al atardecer, paseos con Bruno, amigos, trabajo y nuevos proyectos.',
  },
];
