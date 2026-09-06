'use client';

import { Memory, Participant } from './types';
import { INITIAL_MEMORIES } from './mockData';
import { supabase, isSupabaseConfigured } from './supabase/client';

const LOCAL_STORAGE_KEY = 'nossa_historia_memories_prod_v1';
const ACTIVE_USER_KEY = 'nossa_historia_active_user';

export function getStoredMemories(): Memory[] {
  if (typeof window === 'undefined') return INITIAL_MEMORIES;
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_MEMORIES));
      return INITIAL_MEMORIES;
    }
    return JSON.parse(saved);
  } catch (err) {
    console.error('Error reading memories from localStorage:', err);
    return INITIAL_MEMORIES;
  }
}

export function saveStoredMemories(memories: Memory[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(memories));
  } catch (err) {
    console.error('Error saving memories to localStorage:', err);
  }
}

export function getActiveUser(): 'Ariel' | 'Jazmin' {
  if (typeof window === 'undefined') return 'Ariel';
  try {
    const user = localStorage.getItem(ACTIVE_USER_KEY);
    return user === 'Jazmin' ? 'Jazmin' : 'Ariel';
  } catch {
    return 'Ariel';
  }
}

export function setActiveUser(user: 'Ariel' | 'Jazmin'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_USER_KEY, user);
  } catch (err) {
    console.error('Error saving active user:', err);
  }
}

export async function fetchAllMemories(): Promise<Memory[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('memories')
        .select(`
          id,
          title,
          description,
          memory_date,
          latitude,
          longitude,
          location_name,
          stage_id,
          created_by,
          is_highlight,
          created_at,
          memory_participants (participant_name),
          memory_media (id, url, media_type, caption, order_index)
        `)
        .order('memory_date', { ascending: false });

      if (!error && data) {
        const mapped: Memory[] = data.map((row: any) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          date: row.memory_date,
          locationName: row.location_name,
          coordinates: [row.longitude, row.latitude],
          stageId: row.stage_id,
          createdBy: row.created_by,
          highlight: row.is_highlight,
          createdAt: row.created_at,
          participants: (row.memory_participants || []).map((p: any) => p.participant_name as Participant),
          media: (row.memory_media || [])
            .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
            .map((m: any) => ({
              id: m.id,
              url: m.url,
              type: m.media_type,
              caption: m.caption,
            })),
        }));
        return mapped;
      }
    } catch (err) {
      console.warn('Supabase fetch error, using local storage fallback', err);
    }
  }

  return getStoredMemories();
}

export async function createMemory(memory: Omit<Memory, 'id' | 'createdAt'>): Promise<Memory> {
  const newId = 'mem-' + Date.now();
  const created: Memory = {
    ...memory,
    id: newId,
    createdAt: new Date().toISOString(),
  };

  const current = getStoredMemories();
  const updated = [created, ...current];
  saveStoredMemories(updated);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: memoryRecord, error: memError } = await supabase
        .from('memories')
        .insert({
          title: memory.title,
          description: memory.description,
          memory_date: memory.date,
          latitude: memory.coordinates[1],
          longitude: memory.coordinates[0],
          location_name: memory.locationName,
          stage_id: memory.stageId,
          created_by: memory.createdBy,
          is_highlight: Boolean(memory.highlight),
        })
        .select()
        .single();

      if (!memError && memoryRecord) {
        if (memory.participants.length > 0) {
          await supabase.from('memory_participants').insert(
            memory.participants.map((p) => ({
              memory_id: memoryRecord.id,
              participant_name: p,
            }))
          );
        }

        if (memory.media.length > 0) {
          await supabase.from('memory_media').insert(
            memory.media.map((m, idx) => ({
              memory_id: memoryRecord.id,
              media_type: m.type,
              url: m.url,
              caption: m.caption || '',
              order_index: idx,
            }))
          );
        }
      }
    } catch (err) {
      console.warn('Could not sync to Supabase, saved locally', err);
    }
  }

  return created;
}

export async function updateMemory(memory: Memory): Promise<Memory> {
  const current = getStoredMemories();
  const updated = current.map((m) => (m.id === memory.id ? memory : m));
  saveStoredMemories(updated);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('memories')
        .update({
          title: memory.title,
          description: memory.description,
          memory_date: memory.date,
          latitude: memory.coordinates[1],
          longitude: memory.coordinates[0],
          location_name: memory.locationName,
          stage_id: memory.stageId,
          created_by: memory.createdBy,
          is_highlight: Boolean(memory.highlight),
        })
        .eq('id', memory.id);

      // Re-sync participants
      await supabase.from('memory_participants').delete().eq('memory_id', memory.id);
      if (memory.participants.length > 0) {
        await supabase.from('memory_participants').insert(
          memory.participants.map((p) => ({
            memory_id: memory.id,
            participant_name: p,
          }))
        );
      }

      // Re-sync media
      await supabase.from('memory_media').delete().eq('memory_id', memory.id);
      if (memory.media.length > 0) {
        await supabase.from('memory_media').insert(
          memory.media.map((m, idx) => ({
            memory_id: memory.id,
            media_type: m.type,
            url: m.url,
            caption: m.caption || '',
            order_index: idx,
          }))
        );
      }
    } catch (err) {
      console.warn('Could not update memory in Supabase, saved locally', err);
    }
  }

  return memory;
}

export async function deleteMemory(id: string): Promise<boolean> {
  const current = getStoredMemories();
  const updated = current.filter((m) => m.id !== id);
  saveStoredMemories(updated);

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('memories').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.warn('Could not delete memory in Supabase, removed locally', err);
    }
  }

  return true;
}
