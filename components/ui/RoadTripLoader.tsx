'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArgBraFlagLogo } from './ArgBraFlagLogo';

interface RoadTripLoaderProps {
  durationMs?: number;
  onComplete?: () => void;
}

export const RoadTripLoader: React.FC<RoadTripLoaderProps> = ({
  durationMs = 5000,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        setTimeout(() => {
          setIsFinished(true);
          onComplete?.();
        }, 250);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [durationMs, onComplete]);

  const handleSkip = () => {
    setIsFinished(true);
    onComplete?.();
  };

  return (
    <AnimatePresence>
      {!isFinished && (
        <motion.div
          key="road-trip-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98, filter: 'blur(6px)' }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-gradient-to-b from-sky-50 via-white to-emerald-50 text-slate-800 p-6 select-none overflow-hidden"
        >
          {/* Top Brand (Minimalist) */}
          <div className="pt-6 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <ArgBraFlagLogo size={32} />
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                Nossa História
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              Ariel • Jazmín • Bruno
            </p>
          </div>

          {/* Center: Minimalist Road Trip Scene */}
          <div className="w-full max-w-sm flex flex-col items-center my-auto">
            {/* The Car with Ariel, Jazmín and Bruno */}
            <motion.div
              animate={{
                y: [0, -3, 0.5, -2, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative"
            >
              <svg
                width="240"
                height="120"
                viewBox="0 0 260 130"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-md"
              >
                {/* Roof rack with minimal luggage */}
                <rect x="75" y="24" width="105" height="3" rx="1.5" fill="#475569" />
                <rect x="85" y="14" width="34" height="10" rx="2" fill="#F59E0B" />
                <rect x="125" y="16" width="38" height="8" rx="2" fill="#10B981" />

                {/* Car Cabin Body */}
                <path
                  d="M48 64 L72 32 C76 28 82 27 88 27 L168 27 C176 27 183 31 188 38 L208 64 Z"
                  fill="#0284C7"
                />

                {/* Windows Glass */}
                <path
                  d="M56 62 L74 34 C76 32 80 31 84 31 L118 31 L118 62 Z"
                  fill="#1E293B"
                />
                <path
                  d="M123 31 L166 31 C170 31 175 34 178 38 L194 62 L123 62 Z"
                  fill="#1E293B"
                />

                {/* --- 1. Bruno (Dog) in rear window --- */}
                <g transform="translate(70, 35)">
                  <circle cx="12" cy="11" r="8" fill="#F59E0B" />
                  {/* Floppy ear */}
                  <motion.ellipse
                    cx="6"
                    cy="9"
                    rx="3.5"
                    ry="6"
                    fill="#B45309"
                    animate={{ rotate: [-6, 6, -6] }}
                    transition={{ duration: 0.3, repeat: Infinity }}
                  />
                  <circle cx="13" cy="9" r="1.2" fill="#0F172A" />
                  <ellipse cx="14" cy="12" rx="3" ry="2" fill="#FEF3C7" />
                  {/* Tongue */}
                  <motion.path
                    d="M13 13 C13 16 15 16 15 13"
                    fill="#F43F5E"
                    animate={{ scaleY: [1, 1.25, 1] }}
                    transition={{ duration: 0.25, repeat: Infinity }}
                  />
                </g>

                {/* --- 2. Jazmín in middle window --- */}
                <g transform="translate(130, 33)">
                  {/* Hair */}
                  <path d="M3 9 C0 4 5 1 9 2 C15 2 18 6 18 12 L18 20 L3 20 Z" fill="#78350F" />
                  <circle cx="11" cy="11" r="6.5" fill="#FDE68A" />
                  <circle cx="13" cy="10" r="1" fill="#0F172A" />
                  <path d="M11 13 Q13 15 15 13" stroke="#B45309" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                  {/* Blush */}
                  <circle cx="14" cy="12" r="1" fill="#FDA4AF" opacity="0.8" />
                  {/* Waving hand */}
                  <motion.circle
                    cx="17"
                    cy="14"
                    r="2.5"
                    fill="#FDE68A"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                </g>

                {/* --- 3. Ariel in front window --- */}
                <g transform="translate(160, 33)">
                  {/* Hair */}
                  <path d="M6 5 C7 2 11 2 15 3 C18 4 19 6 19 9 L6 9 Z" fill="#334155" />
                  <circle cx="12" cy="11" r="6.5" fill="#FDE68A" />
                  {/* Sunglasses */}
                  <rect x="10" y="8.5" width="4.5" height="3" rx="0.8" fill="#0F172A" />
                  <rect x="15.5" y="8.5" width="4" height="3" rx="0.8" fill="#0F172A" />
                  <line x1="14" y1="10" x2="16" y2="10" stroke="#0F172A" strokeWidth="1" />
                  <path d="M12 14 Q14 15.5 16 14" stroke="#B45309" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                </g>

                {/* Lower Car Body */}
                <path
                  d="M28 84 C28 72 36 64 48 64 L218 64 C230 64 240 72 240 84 L238 94 C238 98 234 100 230 100 L34 100 C30 100 28 98 28 94 Z"
                  fill="#0284C7"
                />

                {/* Brazilian flag accent strip */}
                <path d="M32 78 L236 78" stroke="#FBBF24" strokeWidth="2.5" />
                <path d="M34 81 L234 81" stroke="#10B981" strokeWidth="1.5" />

                {/* Headlight & Taillight */}
                <path d="M236 73 L239 75 C240 77 240 80 238 82 L234 82 Z" fill="#FEF08A" />
                <path d="M29 74 L27 76 C26 78 26 81 28 82 L30 82 Z" fill="#EF4444" />

                {/* Left Wheel */}
                <g transform="translate(80, 100)">
                  <circle cx="0" cy="0" r="16" fill="#1E293B" />
                  <circle cx="0" cy="0" r="9" fill="#94A3B8" />
                  <circle cx="0" cy="0" r="4" fill="#475569" />
                </g>

                {/* Right Wheel */}
                <g transform="translate(190, 100)">
                  <circle cx="0" cy="0" r="16" fill="#1E293B" />
                  <circle cx="0" cy="0" r="9" fill="#94A3B8" />
                  <circle cx="0" cy="0" r="4" fill="#475569" />
                </g>
              </svg>
            </motion.div>

            {/* Road (Minimalist) */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full relative overflow-hidden mt-[-4px]">
              <motion.div
                animate={{ x: [0, -32] }}
                transition={{ duration: 0.35, repeat: Infinity, ease: 'linear' }}
                className="flex gap-4 w-[200%] absolute left-0"
              >
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="w-4 h-1 bg-white/90 rounded-full shrink-0" />
                ))}
              </motion.div>
            </div>

            {/* Minimalist Progress & Route */}
            <div className="w-full mt-6 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                <span>🇦🇷 Córdoba</span>
                <span className="text-[11px] font-bold text-slate-700">
                  {progress}%
                </span>
                <span>Brasil 🇧🇷</span>
              </div>

              {/* Progress Line */}
              <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 via-amber-400 to-emerald-500 rounded-full transition-all duration-75"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="text-center text-xs text-slate-400 font-medium mt-1">
                Rumbo a nuestra nueva vida...
              </p>
            </div>
          </div>

          {/* Bottom Skip Button (Centered at bottom, prominent and easy to tap) */}
          <div className="pb-4 w-full flex justify-center">
            <button
              onClick={handleSkip}
              className="px-6 py-2 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200 shadow-sm backdrop-blur-md text-xs font-semibold tracking-wide transition active:scale-95"
            >
              Saltar intro
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
