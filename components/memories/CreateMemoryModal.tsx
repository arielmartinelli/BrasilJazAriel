'use client';

import React, { useState } from 'react';
import { Memory, Participant, StageId, STAGES, MediaItem } from '@/lib/types';
import { LocationPickerMap } from '@/components/map/LocationPickerMap';
import { StageIcon } from '@/components/ui/Icons';
import { X, MapPin, Calendar, Camera, UploadCloud, Trash2, Check, Sparkles, Loader2, Navigation } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getAccurateCurrentPosition, reverseGeocode } from '@/lib/geoUtils';

interface CreateMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memory: Omit<Memory, 'id' | 'createdAt'>) => void;
  activeUser: 'Ariel' | 'Jazmin';
}

export const CreateMemoryModal: React.FC<CreateMemoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  activeUser,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [stageId, setStageId] = useState<StageId>('01-viaje');
  const [createdBy, setCreatedBy] = useState<'Ariel' | 'Jazmin'>(activeUser);
  const [participants, setParticipants] = useState<Participant[]>(['Ariel', 'Jazmin', 'Bruno']);
  
  // Default coordinates: Florianópolis
  const [coordinates, setCoordinates] = useState<[number, number]>([-48.5496, -27.6000]);
  const [locationName, setLocationName] = useState('');
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [isQuickGpsLoading, setIsQuickGpsLoading] = useState(false);

  const handleQuickGps = async () => {
    setIsQuickGpsLoading(true);
    try {
      const pos = await getAccurateCurrentPosition();
      setCoordinates(pos);
      const name = await reverseGeocode(pos[1], pos[0]);
      setLocationName(name || 'Mi ubicación actual');
    } catch {
      alert('No pudimos acceder a tu GPS. Puedes abrir el mapa para seleccionar el lugar o pegar un link de Google Maps.');
    } finally {
      setIsQuickGpsLoading(false);
    }
  };

  // Media items (initially empty in production)
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const toggleParticipant = (p: Participant) => {
    if (participants.includes(p)) {
      if (participants.length > 1) {
        setParticipants(participants.filter((item) => item !== p));
      }
    } else {
      setParticipants([...participants, p]);
    }
  };

  // Upload photos/videos to Cloudinary via server API route
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingMedia(true);
    const fileArray = Array.from(files);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadProgressText(`Subiendo a Cloudinary (${i + 1}/${fileArray.length})...`);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setMediaList((prev) => [
            ...prev,
            {
              id: 'med-' + Date.now() + Math.random().toString(36).substring(2, 6),
              url: data.url,
              type: data.type,
              caption: file.name.split('.')[0] || '',
            },
          ]);
        } else {
          const errData = await response.json().catch(() => ({}));
          console.error('Upload failed for', file.name, errData);
          alert(`No se pudo subir la foto (${file.name}): ${errData.error || 'Verifica la clave API Secret de Cloudinary'}`);
        }
      } catch (err: any) {
        console.error('Error uploading file to Cloudinary:', err);
        alert(`Error de red al subir la foto: ${err?.message || 'Error desconocido'}`);
      }
    }

    setIsUploadingMedia(false);
    setUploadProgressText('');
    e.target.value = '';
  };

  const handleAddMediaUrl = () => {
    if (!mediaUrlInput.trim()) return;
    const isVideo = mediaUrlInput.includes('mp4') || mediaUrlInput.includes('webm');
    setMediaList((prev) => [
      ...prev,
      {
        id: 'med-' + Date.now(),
        url: mediaUrlInput.trim(),
        type: isVideo ? 'video' : 'image',
      },
    ]);
    setMediaUrlInput('');
  };

  const handleRemoveMedia = (id: string) => {
    setMediaList((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !locationName.trim()) {
      alert('Por favor completa el título y la ubicación.');
      return;
    }

    setIsSaving(true);

    const newMemory: Omit<Memory, 'id' | 'createdAt'> = {
      title: title.trim(),
      description: description.trim(),
      date,
      locationName: locationName.trim(),
      coordinates,
      stageId,
      createdBy,
      participants,
      media: mediaList,
      highlight: true,
    };

    onSave(newMemory);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#009c3b', '#ffdf00', '#002776'],
      });
    } catch {}

    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl max-h-[92vh] bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* iOS Handle */}
        <div className="sm:hidden w-full flex justify-center pt-3 pb-1 bg-slate-50">
          <div className="w-12 h-1.5 rounded-full bg-slate-300"></div>
        </div>

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="font-bold text-base sm:text-lg text-slate-900">
              Registrar nuevo momento
            </h2>
            <p className="text-xs text-slate-500">Guardar recuerdo de la aventura</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-800 block mb-1">
              Título del momento <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Salida en auto hacia Florianópolis"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>

          {/* Date & Author */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                Fecha
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                Publicado por
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCreatedBy('Ariel')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                    createdBy === 'Ariel'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Ariel
                </button>
                <button
                  type="button"
                  onClick={() => setCreatedBy('Jazmin')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                    createdBy === 'Jazmin'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Jazmín
                </button>
              </div>
            </div>
          </div>

          {/* Stage */}
          <div>
            <label className="text-xs font-semibold text-slate-800 block mb-1.5">
              Etapa
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStageId(s.id)}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                    stageId === s.id
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <StageIcon name={s.iconName} className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="truncate text-[11px]">{s.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Location Picker */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-800">
                Ubicación en el mapa <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleQuickGps}
                disabled={isQuickGpsLoading}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 active:scale-95 transition bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200"
              >
                <Navigation className={`w-3 h-3 ${isQuickGpsLoading ? 'animate-spin' : ''}`} />
                <span>{isQuickGpsLoading ? 'Obteniendo GPS...' : '📍 Usar GPS actual'}</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsPickingLocation(true)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 hover:border-emerald-600 text-left flex items-center justify-between transition"
            >
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-800 truncate">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate font-medium">{locationName || 'Tocar para elegir en mapa o buscar lugar'}</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                Elegir en mapa
              </span>
            </button>
          </div>

          {/* Participants */}
          <div>
            <label className="text-xs font-semibold text-slate-800 block mb-1.5">
              Estuvieron presentes
            </label>
            <div className="flex items-center gap-2">
              {(['Ariel', 'Jazmin', 'Bruno'] as Participant[]).map((p) => {
                const isChecked = participants.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleParticipant(p)}
                    className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      isChecked
                        ? p === 'Bruno'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${isChecked ? 'opacity-100' : 'opacity-0'}`} />
                    <span>{p}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-800 block mb-1">
              Anécdota / Historia
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contá qué pasó ese día o la anécdota del momento..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>

          {/* Media Section with Cloudinary upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                <span>Fotos y Videos ({mediaList.length})</span>
              </label>
              <label className={`cursor-pointer text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 transition ${
                isUploadingMedia ? 'opacity-50 pointer-events-none' : ''
              }`}>
                {isUploadingMedia ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Subiendo...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Subir a Cloudinary</span>
                  </>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  disabled={isUploadingMedia}
                  className="hidden"
                />
              </label>
            </div>

            {/* Upload status indicator */}
            {isUploadingMedia && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 mb-2 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>{uploadProgressText}</span>
              </div>
            )}

            {/* Media previews */}
            {mediaList.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                {mediaList.map((m) => (
                  <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group">
                    {m.type === 'video' ? (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white text-xs font-medium">
                        Video
                      </div>
                    ) : (
                      <img src={m.url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(m.id)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400 mb-2">
                Sin fotos adjuntas aún. Puedes seleccionar fotos desde tu teléfono o computadora.
              </div>
            )}

            {/* Manual URL input */}
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                value={mediaUrlInput}
                onChange={(e) => setMediaUrlInput(e.target.value)}
                placeholder="O pegar URL directa de imagen/video..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
              />
              <button
                type="button"
                onClick={handleAddMediaUrl}
                className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition"
              >
                Agregar
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 border-t border-slate-200">
            <button
              type="submit"
              disabled={isSaving || isUploadingMedia}
              className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSaving ? 'Guardando recuerdo...' : 'Guardar recuerdo'}</span>
            </button>
          </div>
        </form>
      </div>

      {isPickingLocation && (
        <LocationPickerMap
          initialCoordinates={coordinates}
          initialLocationName={locationName}
          onConfirm={(newCoords, newName) => {
            setCoordinates(newCoords);
            setLocationName(newName);
            setIsPickingLocation(false);
          }}
          onCancel={() => setIsPickingLocation(false)}
        />
      )}
    </div>
  );
};
