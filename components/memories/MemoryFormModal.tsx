'use client';

import React, { useCallback, useId, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  X, MapPin, Calendar, Camera, UploadCloud, Trash2, Check,
  Sparkles, Loader2, Navigation, AlertCircle,
} from 'lucide-react';
import { Memory, Participant, StageId, STAGES, MediaItem } from '@/lib/types';
import { LocationPickerMap } from '@/components/map/LocationPickerMap';
import { StageIcon } from '@/components/ui/Icons';
import { getAccurateCurrentPosition, reverseGeocode } from '@/lib/geoUtils';
import { showErrorAlert } from '@/lib/alerts';
import { safeImageSrc, thumbUrl, videoPosterUrl } from '@/lib/media';
import { safeMediaUrl } from '@/lib/validation';
import { useModalA11y } from '@/hooks/useModalA11y';

type Draft = Omit<Memory, 'id' | 'createdAt'>;

interface MemoryFormModalProps {
  isOpen: boolean;
  /** null = crear uno nuevo; con valor = editar ese recuerdo. */
  memory: Memory | null;
  activeUser: 'Ariel' | 'Jazmin';
  onClose: () => void;
  onSubmit: (draft: Draft) => Promise<void>;
}

const FLORIPA: [number, number] = [-48.5496, -27.6];
const ALL_PARTICIPANTS: Participant[] = ['Ariel', 'Jazmin', 'Bruno'];
const MAX_IMAGE_MB = 15;
const MAX_VIDEO_MB = 120;

function todayIso(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Un solo formulario para crear y para editar.
 * Antes eran dos componentes de ~480 líneas casi idénticos: cualquier arreglo
 * había que hacerlo dos veces y siempre quedaba uno desactualizado.
 */
export const MemoryFormModal: React.FC<MemoryFormModalProps> = ({
  isOpen, memory, activeUser, onClose, onSubmit,
}) => {
  const isEditing = Boolean(memory);
  const titleId = useId();
  const containerRef = useModalA11y(isOpen, onClose);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayIso);
  const [stageId, setStageId] = useState<StageId>('01-viaje');
  const [createdBy, setCreatedBy] = useState<'Ariel' | 'Jazmin'>(activeUser);
  const [participants, setParticipants] = useState<Participant[]>(['Ariel', 'Jazmin', 'Bruno']);
  const [coordinates, setCoordinates] = useState<[number, number]>(FLORIPA);
  const [locationName, setLocationName] = useState('');
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [mediaUrlInput, setMediaUrlInput] = useState('');

  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset del formulario al abrir, o al pasar de un recuerdo a otro.
  // Se hace durante el render (patrón oficial de React para derivar estado de
  // las props) en vez de en un efecto: la versión anterior disparaba seis
  // setState dentro de useEffect y provocaba renders en cascada.
  const resetKey = isOpen ? (memory?.id ?? 'nuevo') : null;
  const [lastResetKey, setLastResetKey] = useState<string | null>(null);

  if (resetKey !== null && resetKey !== lastResetKey) {
    setLastResetKey(resetKey);

    if (memory) {
      setTitle(memory.title);
      setDescription(memory.description);
      setDate(memory.date);
      setStageId(memory.stageId);
      setCreatedBy(memory.createdBy);
      setParticipants(memory.participants.length ? memory.participants : ['Ariel', 'Jazmin']);
      setCoordinates(memory.coordinates);
      setLocationName(memory.locationName);
      setMediaList(memory.media);
    } else {
      setTitle('');
      setDescription('');
      setDate(todayIso());
      setStageId('01-viaje');
      setCreatedBy(activeUser);
      setParticipants(['Ariel', 'Jazmin', 'Bruno']);
      setCoordinates(FLORIPA);
      setLocationName('');
      setMediaList([]);
    }
    setMediaUrlInput('');
    setFormError(null);
  }

  // Al cerrarse, se olvida la clave para que la próxima apertura vuelva a
  // inicializar el formulario desde cero.
  if (resetKey === null && lastResetKey !== null) {
    setLastResetKey(null);
  }

  const toggleParticipant = useCallback((participant: Participant) => {
    setParticipants((current) => {
      if (!current.includes(participant)) return [...current, participant];
      // Siempre queda al menos uno.
      return current.length > 1 ? current.filter((item) => item !== participant) : current;
    });
  }, []);

  const handleGps = useCallback(async () => {
    setIsLocating(true);
    try {
      const position = await getAccurateCurrentPosition();
      setCoordinates(position);
      const name = await reverseGeocode(position[1], position[0]);
      setLocationName(name || 'Mi ubicación actual');
    } catch {
      showErrorAlert(
        'GPS no disponible',
        'No pudimos acceder a tu ubicación. Podés elegir el lugar en el mapa o pegar un link de Google Maps.'
      );
    } finally {
      setIsLocating(false);
    }
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    const list = Array.from(files);
    event.target.value = '';
    setIsUploading(true);

    const failures: string[] = [];

    for (let i = 0; i < list.length; i += 1) {
      const file = list[i];
      setUploadStatus(`Subiendo ${i + 1} de ${list.length}: ${file.name}`);

      // Chequeo en el navegador para no gastar la subida en un archivo que el
      // servidor va a rechazar igual.
      const isVideo = file.type.startsWith('video');
      const limitMb = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
      if (file.size > limitMb * 1024 * 1024) {
        failures.push(`${file.name}: supera los ${limitMb} MB`);
        continue;
      }

      try {
        const body = new FormData();
        body.append('file', file);
        const response = await fetch('/api/upload', { method: 'POST', body });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          failures.push(`${file.name}: ${data?.error ?? 'no se pudo subir'}`);
          continue;
        }

        setMediaList((current) => [
          ...current,
          {
            id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            url: data.url,
            type: data.type,
            caption: '',
          },
        ]);
      } catch {
        failures.push(`${file.name}: sin conexión`);
      }
    }

    setIsUploading(false);
    setUploadStatus('');

    if (failures.length > 0) {
      showErrorAlert(
        failures.length === list.length ? 'No se pudo subir' : 'Algunos archivos fallaron',
        failures.slice(0, 4).join('\n')
      );
    }
  }, []);

  const handleAddMediaUrl = useCallback(() => {
    const value = mediaUrlInput.trim();
    if (!value) return;

    // Antes se aceptaba cualquier texto como URL, incluido `javascript:`.
    const parsed = safeMediaUrl.safeParse(value);
    if (!parsed.success) {
      setFormError('La URL debe ser https y de Cloudinary o Unsplash.');
      return;
    }

    setMediaList((current) => [
      ...current,
      {
        id: `med-${Date.now()}`,
        url: parsed.data,
        type: /\.(mp4|webm|mov|m4v)(\?|$)/i.test(parsed.data) ? 'video' : 'image',
      },
    ]);
    setMediaUrlInput('');
    setFormError(null);
  }, [mediaUrlInput]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving || isUploading) return;

    if (!title.trim()) return setFormError('Poné un título al momento.');
    if (!locationName.trim()) return setFormError('Elegí la ubicación en el mapa o usá el GPS.');

    setFormError(null);
    setIsSaving(true);

    try {
      // Antes no se esperaba el guardado: el modal se cerraba al instante y,
      // si Supabase fallaba, nadie se enteraba.
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        date,
        locationName: locationName.trim(),
        coordinates,
        stageId,
        createdBy,
        participants,
        media: mediaList,
        highlight: memory?.highlight ?? false,
      });

      if (!isEditing) {
        try {
          confetti({
            particleCount: 60,
            spread: 65,
            origin: { y: 0.6 },
            colors: ['#009c3b', '#ffdf00', '#75aadb'],
            disableForReducedMotion: true,
          });
        } catch { /* el confeti nunca debe romper el guardado */ }
      }

      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el recuerdo.');
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving, isUploading, title, locationName, description, date, coordinates,
    stageId, createdBy, participants, mediaList, memory, isEditing, onSubmit, onClose,
  ]);

  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-base text-slate-900 placeholder-slate-400 transition focus:border-emerald-600 focus:bg-white';

  const previews = useMemo(
    () =>
      mediaList.map((item) => ({
        ...item,
        preview:
          item.type === 'video'
            ? safeImageSrc(videoPosterUrl(item.url, 200))
            : safeImageSrc(thumbUrl(item.url, { width: 200, height: 200 })),
      })),
    [mediaList]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-slate-900/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className="relative flex max-h-[93dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl outline-none sm:rounded-3xl"
      >
        <div className="flex w-full justify-center bg-slate-50 pb-1 pt-3 sm:hidden">
          <span className="h-1.5 w-12 rounded-full bg-slate-300" aria-hidden />
        </div>

        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-slate-900">
              {isEditing ? 'Editar recuerdo' : 'Registrar nuevo momento'}
            </h2>
            <p className="text-sm text-slate-500">
              {isEditing ? 'Actualizá los detalles' : 'Guardá un recuerdo de la aventura'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 transition hover:bg-slate-300"
          >
            <X className="h-4 w-4" aria-hidden />
            <span className="sr-only">Cerrar</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto p-4 sm:p-6">
          <div>
            <label htmlFor="memory-title" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Título del momento <span className="text-rose-600">*</span>
            </label>
            <input
              id="memory-title"
              type="text"
              required
              maxLength={140}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Primer chapuzón en Campeche"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="memory-date" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Fecha
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  id="memory-date"
                  type="date"
                  value={date}
                  max={todayIso()}
                  onChange={(event) => setDate(event.target.value)}
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>

            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-slate-800">Publicado por</legend>
              <div className="grid grid-cols-2 gap-2">
                {(['Ariel', 'Jazmin'] as const).map((author) => (
                  <button
                    key={author}
                    type="button"
                    onClick={() => setCreatedBy(author)}
                    aria-pressed={createdBy === author}
                    className={`rounded-xl border px-2 py-2.5 text-sm font-bold transition ${
                      createdBy === author
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {author === 'Jazmin' ? 'Jazmín' : 'Ariel'}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-slate-800">Etapa</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {STAGES.map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setStageId(stage.id)}
                  aria-pressed={stageId === stage.id}
                  className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition ${
                    stageId === stage.id
                      ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-900 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <StageIcon name={stage.iconName} className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span className="truncate text-xs">{stage.title}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800">
                Ubicación <span className="text-rose-600">*</span>
              </span>
              <button
                type="button"
                onClick={handleGps}
                disabled={isLocating}
                className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 active:scale-95 disabled:opacity-60"
              >
                <Navigation className={`h-3.5 w-3.5 ${isLocating ? 'animate-spin' : ''}`} aria-hidden />
                {isLocating ? 'Obteniendo GPS…' : 'Usar mi GPS'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsPickingLocation(true)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-left transition hover:border-emerald-600"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm text-slate-800">
                <MapPin className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                <span className="truncate font-medium">
                  {locationName || 'Tocá para elegir en el mapa o buscar el lugar'}
                </span>
              </span>
              <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                Elegir
              </span>
            </button>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-slate-800">Estuvieron presentes</legend>
            <div className="flex items-center gap-2">
              {ALL_PARTICIPANTS.map((participant) => {
                const checked = participants.includes(participant);
                return (
                  <button
                    key={participant}
                    type="button"
                    onClick={() => toggleParticipant(participant)}
                    aria-pressed={checked}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2.5 text-sm font-semibold transition ${
                      checked
                        ? participant === 'Bruno'
                          ? 'border-amber-400 bg-amber-100 text-amber-900'
                          : 'border-emerald-400 bg-emerald-100 text-emerald-900'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    <Check className={`h-4 w-4 ${checked ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
                    {participant === 'Jazmin' ? 'Jazmín' : participant}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="memory-description" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Anécdota
            </label>
            <textarea
              id="memory-description"
              rows={3}
              maxLength={4000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Contá qué pasó ese día…"
              className={inputClass}
            />
          </div>

          {/* Fotos y videos */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <Camera className="h-4 w-4 text-emerald-600" aria-hidden />
                Fotos y videos ({mediaList.length})
              </span>
              <label
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 ${
                  isUploading ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                {isUploading ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Subiendo…</>
                ) : (
                  <><UploadCloud className="h-3.5 w-3.5" aria-hidden /> Agregar archivos</>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>

            {isUploading && (
              <p
                role="status"
                aria-live="polite"
                className="mb-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800"
              >
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-emerald-600" aria-hidden />
                <span className="truncate">{uploadStatus}</span>
              </p>
            )}

            {previews.length > 0 ? (
              <ul className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {previews.map((item) => (
                  <li key={item.id} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    {item.preview ? (
                      <img src={item.preview} alt="" width={200} height={200} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-slate-800 text-xs font-medium text-white">
                        {item.type === 'video' ? 'Video' : 'Archivo'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setMediaList((current) => current.filter((m) => m.id !== item.id))}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-rose-600"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                      <span className="sr-only">Quitar archivo</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-2 rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                Sin fotos todavía. Máximo {MAX_IMAGE_MB} MB por foto y {MAX_VIDEO_MB} MB por video.
              </p>
            )}

            <div className="flex items-center gap-1.5">
              <label htmlFor="media-url" className="sr-only-focusable">Pegar URL de imagen o video</label>
              <input
                id="media-url"
                type="url"
                value={mediaUrlInput}
                onChange={(event) => setMediaUrlInput(event.target.value)}
                placeholder="O pegar una URL de Cloudinary…"
                className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-600"
              />
              <button
                type="button"
                onClick={handleAddMediaUrl}
                className="rounded-xl bg-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-300"
              >
                Agregar
              </button>
            </div>
          </div>

          {formError && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span className="whitespace-pre-line">{formError}</span>
            </p>
          )}

          <div className="border-t border-slate-200 pt-3">
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
              {isSaving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Guardar recuerdo'}
            </button>
          </div>
        </form>
      </div>

      {isPickingLocation && (
        <LocationPickerMap
          initialCoordinates={coordinates}
          initialLocationName={locationName}
          onConfirm={(newCoordinates, newName) => {
            setCoordinates(newCoordinates);
            setLocationName(newName);
            setIsPickingLocation(false);
          }}
          onCancel={() => setIsPickingLocation(false)}
        />
      )}
    </div>
  );
};
