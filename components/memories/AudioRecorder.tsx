'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2, Check, Loader2, AlertCircle } from 'lucide-react';
import { formatDuration } from '@/lib/uploadClient';

interface AudioRecorderProps {
  /** Recibe el audio grabado como archivo, listo para subir. */
  onRecorded: (file: File) => void;
  disabled?: boolean;
}

/** Formato que soporta este navegador. Safari no graba webm; usa mp4. */
function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

/**
 * Graba una nota de voz desde el navegador.
 *
 * El audio queda en memoria hasta que la persona lo acepta: si no le gusta,
 * lo descarta y no se sube nada. Se corta solo a los 5 minutos para no llenar
 * la cuota con una grabación olvidada.
 */
const MAX_SECONDS = 300;

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecorded, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const releaseMic = useCallback(() => {
    // Sin esto queda prendida la luz del micrófono del teléfono.
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Limpieza al desmontar: micrófono liberado y URL de preview revocada.
  useEffect(() => {
    return () => {
      releaseMic();
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [releaseMic, previewUrl]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setIsRecording(false);
    releaseMic();
  }, [releaseMic]);

  const start = useCallback(async () => {
    if (disabled || isStarting) return;
    setError(null);
    setIsStarting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        blobRef.current = blob;
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
      };

      recorder.start();
      setIsRecording(true);
      setSeconds(0);

      timerRef.current = window.setInterval(() => {
        setSeconds((value) => {
          if (value + 1 >= MAX_SECONDS) stop();
          return value + 1;
        });
      }, 1000);
    } catch (err) {
      const name = (err as DOMException)?.name;
      setError(
        name === 'NotAllowedError'
          ? 'No diste permiso para usar el micrófono.'
          : name === 'NotFoundError'
            ? 'No encontramos ningún micrófono.'
            : 'No pudimos acceder al micrófono.'
      );
      releaseMic();
    } finally {
      setIsStarting(false);
    }
  }, [disabled, isStarting, releaseMic, stop]);

  const discard = useCallback(() => {
    blobRef.current = null;
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    setSeconds(0);
  }, []);

  const accept = useCallback(() => {
    const blob = blobRef.current;
    if (!blob) return;

    // Nombre y extensión coherentes con lo que grabó el navegador.
    const extension = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
    const file = new File([blob], `nota-de-voz-${Date.now()}.${extension}`, { type: blob.type });

    onRecorded(file);
    discard();
  }, [onRecorded, discard]);

  // Grabación lista, esperando confirmación.
  if (previewUrl) {
    return (
      <div className="flex flex-col gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <p className="text-sm font-semibold text-emerald-900">
          Nota de voz de {formatDuration(seconds)} — escuchala antes de guardar
        </p>
        <audio src={previewUrl} controls className="w-full" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={accept}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-600 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 active:scale-95"
          >
            <Check className="h-4 w-4" aria-hidden />
            Usar esta
          </button>
          <button
            type="button"
            onClick={discard}
            className="flex items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Descartar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={isRecording ? stop : start}
        disabled={disabled || isStarting}
        aria-pressed={isRecording}
        className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition active:scale-[0.98] disabled:opacity-50 ${
          isRecording
            ? 'border-rose-300 bg-rose-50 text-rose-700'
            : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-emerald-500 hover:text-emerald-700'
        }`}
      >
        {isStarting ? (
          <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Preparando micrófono…</>
        ) : isRecording ? (
          <>
            <span className="relative flex h-3 w-3" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-600" />
            </span>
            Grabando {formatDuration(seconds)} — tocá para frenar
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
          </>
        ) : (
          <><Mic className="h-4 w-4" aria-hidden /> Grabar nota de voz</>
        )}
      </button>

      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-sm font-medium text-rose-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
};
