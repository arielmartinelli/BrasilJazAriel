import 'server-only';
import { supabaseAdmin } from './supabaseAdmin';
import type { MemoryInput } from '../validation';
import type { Memory, Participant } from '../types';

type Row = Record<string, unknown>;

/** Convierte una fila de Supabase al modelo que usa la UI. */
function rowToMemory(row: Row): Memory {
  const participants = (row.memory_participants as Row[] | null) ?? [];
  const media = (row.memory_media as Row[] | null) ?? [];

  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    date: String(row.memory_date ?? ''),
    locationName: String(row.location_name ?? ''),
    coordinates: [Number(row.longitude), Number(row.latitude)],
    stageId: row.stage_id as Memory['stageId'],
    createdBy: row.created_by as Memory['createdBy'],
    highlight: Boolean(row.is_highlight),
    createdAt: row.created_at ? String(row.created_at) : undefined,
    participants: participants.map((p) => p.participant_name as Participant),
    media: [...media]
      .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0))
      .map((m) => ({
        id: String(m.id),
        url: String(m.url),
        type: m.media_type as 'image' | 'video',
        caption: m.caption ? String(m.caption) : undefined,
      })),
  };
}

const SELECT = `
  id, title, description, memory_date, latitude, longitude, location_name,
  stage_id, created_by, is_highlight, created_at,
  memory_participants (participant_name),
  memory_media (id, url, media_type, caption, order_index)
`;

export async function listMemories(): Promise<Memory[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from('memories')
    .select(SELECT)
    .order('memory_date', { ascending: false })
    .limit(2000);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToMemory(row as Row));
}

async function syncChildren(memoryId: string, input: MemoryInput) {
  if (!supabaseAdmin) return;

  await supabaseAdmin.from('memory_participants').delete().eq('memory_id', memoryId);
  if (input.participants.length > 0) {
    const { error } = await supabaseAdmin.from('memory_participants').insert(
      input.participants.map((p) => ({ memory_id: memoryId, participant_name: p }))
    );
    if (error) throw new Error(error.message);
  }

  await supabaseAdmin.from('memory_media').delete().eq('memory_id', memoryId);
  if (input.media.length > 0) {
    const { error } = await supabaseAdmin.from('memory_media').insert(
      input.media.map((m, index) => ({
        memory_id: memoryId,
        media_type: m.type,
        url: m.url,
        caption: m.caption ?? '',
        order_index: index,
      }))
    );
    if (error) throw new Error(error.message);
  }
}

function toRow(input: MemoryInput) {
  return {
    title: input.title,
    description: input.description,
    memory_date: input.date,
    latitude: input.coordinates[1],
    longitude: input.coordinates[0],
    location_name: input.locationName,
    stage_id: input.stageId,
    created_by: input.createdBy,
    is_highlight: Boolean(input.highlight),
  };
}

export async function insertMemory(input: MemoryInput): Promise<Memory> {
  if (!supabaseAdmin) throw new Error('Supabase no esta configurado en el servidor');

  const { data, error } = await supabaseAdmin
    .from('memories')
    .insert(toRow(input))
    .select('id, created_at')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'No se pudo crear el recuerdo');

  await syncChildren(String(data.id), input);

  return {
    ...input,
    id: String(data.id),
    createdAt: String(data.created_at),
    description: input.description,
    highlight: Boolean(input.highlight),
  } as Memory;
}

export async function updateMemoryRow(id: string, input: MemoryInput): Promise<Memory> {
  if (!supabaseAdmin) throw new Error('Supabase no esta configurado en el servidor');

  const { error } = await supabaseAdmin.from('memories').update(toRow(input)).eq('id', id);
  if (error) throw new Error(error.message);

  await syncChildren(id, input);
  return { ...input, id, highlight: Boolean(input.highlight) } as Memory;
}

export async function deleteMemoryRow(id: string): Promise<void> {
  if (!supabaseAdmin) throw new Error('Supabase no esta configurado en el servidor');
  const { error } = await supabaseAdmin.from('memories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
