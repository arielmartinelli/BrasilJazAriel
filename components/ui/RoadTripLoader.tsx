'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palmtree, MapPin, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { ArgBraFlagLogo } from './ArgBraFlagLogo';

interface RoadTripLoaderProps {
  durationMs?: number;
  onComplete?: () => void;
}

export const RoadTripLoader: React.FC<RoadTripLoaderProps> = ({
  durationMs = 3200,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [subtitle, setSubtitle] = useState('Cargando el auto en Córdoba...');

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);

      if (pct < 35) {
        setSubtitle('Cargando las valijas en Córdoba, Argentina 🇦🇷');
      } else if (pct < 75) {
        setSubtitle('Viajando por Ruta 14 con Ariel, Jaz y Bruno 🚗💨');
      } else if (pct < 98) {
        setSubtitle('¡Cruzando la frontera hacia Brasil! 🇧🇷🌴');
      } else {
        setSubtitle('¡Bem-vindos ao Brasil! Chegamos! ✨');
      }

      if (elapsed >= durationMs) {
        clearInterval(interval);
        setTimeout(() => {
          setIsFinished(true);
          onComplete?.();
        }, 300);
      }
    }, 40);

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
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-gradient-to-b from-sky-400 via-emerald-100 to-amber-50 text-slate-800 p-6 select-none overflow-hidden"
        >
          {/* Top Skip Button & Brand */}
          <div className="w-full max-w-lg flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <ArgBraFlagLogo size={28} />
              <span className="font-bold tracking-tight text-slate-900 text-sm">
                Nossa História
              </span>
            </div>
            <button
              onClick={handleSkip}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/70 hover:bg-white text-slate-700 backdrop-blur-md shadow-xs transition"
            >
              Saltar
            </button>
          </div>

          {/* Center Stage: The Road Trip Animation Scene */}
          <div className="w-full max-w-md flex flex-col items-center my-auto">
            {/* Animated Clouds and Birds */}
            <div className="relative w-full h-12 overflow-hidden mb-2 pointer-events-none">
              <motion.div
                animate={{ x: ['120%', '-40%'] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
                className="absolute top-1 text-white/80 font-black text-2xl"
              >
                ☁️
              </motion.div>
              <motion.div
                animate={{ x: ['110%', '-30%'] }}
                transition={{ duration: 9, repeat: Infinity, ease: 'linear', delay: 1 }}
                className="absolute top-4 text-white/70 font-black text-lg"
              >
                ☁️
              </motion.div>
              <motion.div
                animate={{ x: ['-20%', '120%'], y: [0, -3, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                className="absolute top-2 text-slate-600 text-xs font-bold"
              >
                🕊️
              </motion.div>
            </div>

            {/* Background Transition Elements (Sierras de Córdoba ➔ Playas de Brasil) */}
            <div className="w-full flex items-end justify-between px-4 mb-[-12px] opacity-70 z-0">
              <div className="flex flex-col items-center">
                <span className="text-xl">⛰️</span>
                <span className="text-[10px] font-bold text-slate-600">Córdoba</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                <span>☀️</span>
                <span className="text-[10px] text-emerald-800 tracking-wider uppercase font-extrabold">
                  Ruta 14
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl animate-bounce">🌴</span>
                <span className="text-[10px] font-bold text-emerald-800">Brasil</span>
              </div>
            </div>

            {/* Car & Characters Visual Illustration */}
            <div className="relative w-full flex flex-col items-center z-10">
              {/* Floating dust/speed lines */}
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 pointer-events-none">
                <motion.div
                  animate={{ x: [-8, -24], opacity: [0.8, 0] }}
                  transition={{ duration: 0.4, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-1 bg-amber-400 rounded-full"
                />
                <motion.div
                  animate={{ x: [-4, -20], opacity: [0.6, 0] }}
                  transition={{ duration: 0.35, repeat: Infinity, ease: 'linear', delay: 0.1 }}
                  className="w-4 h-0.5 bg-slate-300 rounded-full"
                />
                <motion.div
                  animate={{ x: [-10, -28], opacity: [0.9, 0] }}
                  transition={{ duration: 0.45, repeat: Infinity, ease: 'linear', delay: 0.15 }}
                  className="w-6 h-1 bg-emerald-400 rounded-full"
                />
              </div>

              {/* Bouncing Car with Ariel, Jazmín & Bruno */}
              <motion.div
                animate={{
                  y: [0, -3.5, 0.5, -2, 0],
                  rotate: [0, -0.8, 0.5, -0.4, 0],
                }}
                transition={{
                  duration: 0.55,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative cursor-pointer"
              >
                {/* SVG Illustration of Road Trip SUV with Characters */}
                <svg
                  width="260"
                  height="140"
                  viewBox="0 0 260 140"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-xl"
                >
                  {/* Roof Luggage Rack */}
                  <rect x="65" y="24" width="115" height="4" rx="2" fill="#334155" />
                  <rect x="80" y="20" width="4" height="6" fill="#475569" />
                  <rect x="160" y="20" width="4" height="6" fill="#475569" />

                  {/* Luggage / Bags / Surfboard */}
                  {/* Big yellow suitcase */}
                  <rect x="75" y="10" width="38" height="15" rx="3" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
                  <rect x="90" y="7" width="8" height="4" rx="1.5" fill="#B45309" />
                  {/* Green duffle bag */}
                  <rect x="117" y="12" width="34" height="13" rx="4" fill="#10B981" stroke="#047857" strokeWidth="1.5" />
                  {/* Brasilian tropical plant/mate in suitcase */}
                  <circle cx="158" cy="17" r="7" fill="#059669" />
                  <path d="M158 12 C162 6 166 10 162 14" stroke="#34D399" strokeWidth="2" strokeLinecap="round" />

                  {/* Car Roof & Cabin Body */}
                  <path
                    d="M45 68 L70 32 C74 28 80 27 86 27 L170 27 C178 27 185 31 190 38 L212 68 Z"
                    fill="#0284C7"
                  />
                  {/* Roof Highlight */}
                  <path
                    d="M86 29 L170 29"
                    stroke="#38BDF8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Windows Background (Dark Glass) */}
                  <path
                    d="M54 66 L74 35 C76 32 80 31 84 31 L120 31 L120 66 Z"
                    fill="#1E293B"
                  />
                  <path
                    d="M125 31 L168 31 C173 31 178 34 181 38 L198 66 L125 66 Z"
                    fill="#1E293B"
                  />
                  <path
                    d="M201 66 L183 39 L192 39 L208 66 Z"
                    fill="#1E293B"
                  />

                  {/* ================= CHARACTERS INSIDE ================= */}

                  {/* 1. BRUNO (The Dog) in the back window (left side) */}
                  <g transform="translate(68, 38)">
                    {/* Dog Body / Neck */}
                    <rect x="4" y="15" width="16" height="14" rx="4" fill="#D97706" />
                    {/* Dog Head */}
                    <circle cx="12" cy="11" r="9" fill="#F59E0B" />
                    {/* Floppy Dog Ear blowing in wind */}
                    <motion.ellipse
                      cx="5"
                      cy="8"
                      rx="4"
                      ry="7"
                      fill="#B45309"
                      animate={{ rotate: [-8, 8, -8] }}
                      transition={{ duration: 0.25, repeat: Infinity }}
                    />
                    {/* Dog Eyes */}
                    <circle cx="11" cy="9" r="1.5" fill="#1E293B" />
                    <circle cx="15" cy="9" r="1.5" fill="#1E293B" />
                    {/* Dog Snout */}
                    <ellipse cx="14" cy="13" rx="3.5" ry="2.5" fill="#FEF3C7" />
                    <circle cx="14" cy="12" r="1" fill="#1E293B" />
                    {/* Tongue hanging out happily */}
                    <motion.path
                      d="M13 14 C13 17 15 17 15 14"
                      fill="#F43F5E"
                      stroke="#E11D48"
                      strokeWidth="0.5"
                      animate={{ scaleY: [1, 1.3, 1] }}
                      transition={{ duration: 0.2, repeat: Infinity }}
                    />
                    {/* Tiny Dog collar */}
                    <rect x="6" y="19" width="12" height="2.5" rx="1" fill="#10B981" />
                  </g>

                  {/* 2. JAZMÍN (Passenger / Middle Window) */}
                  <g transform="translate(130, 36)">
                    {/* Hair (Ponytail flying slightly) */}
                    <motion.path
                      d="M2 10 C-3 6 -2 1 5 3 C10 1 18 1 20 7 C21 14 18 20 18 24 L2 24 Z"
                      fill="#78350F"
                      animate={{ rotate: [-2, 2, -2] }}
                      transition={{ duration: 0.35, repeat: Infinity }}
                    />
                    {/* Head */}
                    <circle cx="11" cy="11" r="7" fill="#FDE68A" />
                    {/* Smile and Eyes */}
                    <circle cx="13" cy="10" r="1" fill="#1E293B" />
                    <path d="M11 13 Q13 15 15 13" stroke="#B45309" strokeWidth="1" fill="none" strokeLinecap="round" />
                    {/* Cheeks blush */}
                    <circle cx="14" cy="12" r="1.2" fill="#FDA4AF" opacity="0.8" />
                    {/* Waving Hand out or near glass */}
                    <motion.g
                      animate={{ rotate: [0, 15, -5, 10, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      style={{ transformOrigin: '18px 18px' }}
                    >
                      <circle cx="18" cy="16" r="3" fill="#FDE68A" />
                    </motion.g>
                    {/* Shirt */}
                    <path d="M4 22 C6 18 16 18 18 22 L18 28 L4 28 Z" fill="#F43F5E" />
                  </g>

                  {/* 3. ARIEL (Driving / Front Window) */}
                  <g transform="translate(162, 36)">
                    {/* Hair */}
                    <path d="M5 6 C5 3 8 2 13 2 C18 2 21 4 21 7 C21 9 19 10 19 12 L5 12 Z" fill="#374151" />
                    {/* Head */}
                    <circle cx="13" cy="11" r="7" fill="#FDE68A" />
                    {/* Cool Sunglasses for the road trip */}
                    <rect x="11" y="8" width="5" height="3.5" rx="1" fill="#111827" />
                    <rect x="17" y="8" width="4.5" height="3.5" rx="1" fill="#111827" />
                    <line x1="15.5" y1="9.5" x2="17.5" y2="9.5" stroke="#111827" strokeWidth="1" />
                    {/* Big Smile */}
                    <path d="M12 14 Q15 16 17 14" stroke="#B45309" strokeWidth="1" fill="none" strokeLinecap="round" />
                    {/* Shirt */}
                    <path d="M6 22 C8 18 18 18 20 22 L20 28 L6 28 Z" fill="#10B981" />
                    {/* Steering Wheel visible */}
                    <ellipse cx="22" cy="22" rx="2" ry="5" fill="#4B5563" />
                  </g>

                  {/* ================= LOWER CAR BODY ================= */}
                  {/* Main Car Lower Hull */}
                  <path
                    d="M25 90 C25 76 34 68 46 68 L224 68 C238 68 248 76 248 88 L246 100 C246 104 242 106 238 106 L28 106 C24 106 22 102 23 98 Z"
                    fill="#0284C7"
                  />
                  {/* Side Accent Stripe (Brasil Yellow & Green) */}
                  <path d="M28 84 L244 84" stroke="#FBBF24" strokeWidth="3" />
                  <path d="M30 87 L242 87" stroke="#10B981" strokeWidth="2" />

                  {/* Car Door Lines & Handle */}
                  <line x1="122" y1="68" x2="122" y2="103" stroke="#0369A1" strokeWidth="1.5" />
                  <line x1="172" y1="68" x2="172" y2="103" stroke="#0369A1" strokeWidth="1.5" />
                  <rect x="108" y="74" width="8" height="2.5" rx="1" fill="#E2E8F0" />
                  <rect x="158" y="74" width="8" height="2.5" rx="1" fill="#E2E8F0" />

                  {/* Headlights & Taillights */}
                  {/* Front glowing headlights */}
                  <path d="M242 75 L247 77 C249 79 249 84 246 86 L240 86 Z" fill="#FEF08A" />
                  {/* Rear taillights */}
                  <path d="M26 76 L23 78 C22 80 22 84 24 86 L28 86 Z" fill="#EF4444" />

                  {/* Wheel Arches Cutouts */}
                  <path d="M52 106 C52 92 65 82 80 82 C95 82 108 92 108 106 Z" fill="#38BDF8" opacity="0.3" />
                  <path d="M172 106 C172 92 185 82 200 82 C215 82 228 92 228 106 Z" fill="#38BDF8" opacity="0.3" />

                  {/* Left Wheel (Back) */}
                  <g transform="translate(80, 106)">
                    <circle cx="0" cy="0" r="18" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
                    <circle cx="0" cy="0" r="11" fill="#94A3B8" />
                    <circle cx="0" cy="0" r="5" fill="#475569" />
                    {/* Spokes */}
                    <line x1="-9" y1="0" x2="9" y2="0" stroke="#CBD5E1" strokeWidth="2" />
                    <line x1="0" y1="-9" x2="0" y2="9" stroke="#CBD5E1" strokeWidth="2" />
                  </g>

                  {/* Right Wheel (Front) */}
                  <g transform="translate(200, 106)">
                    <circle cx="0" cy="0" r="18" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
                    <circle cx="0" cy="0" r="11" fill="#94A3B8" />
                    <circle cx="0" cy="0" r="5" fill="#475569" />
                    {/* Spokes */}
                    <line x1="-9" y1="0" x2="9" y2="0" stroke="#CBD5E1" strokeWidth="2" />
                    <line x1="0" y1="-9" x2="0" y2="9" stroke="#CBD5E1" strokeWidth="2" />
                  </g>

                  {/* Exhaust Pipe & Smoke Puffs */}
                  <rect x="16" y="99" width="10" height="4" rx="1.5" fill="#475569" />
                </svg>

                {/* Animated Exhaust Puffs */}
                <div className="absolute left-2 bottom-3 pointer-events-none">
                  <motion.div
                    animate={{ x: [-5, -28], y: [0, -8], scale: [0.5, 1.8], opacity: [0.7, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: 'easeOut' }}
                    className="w-3 h-3 rounded-full bg-slate-300/80 absolute"
                  />
                  <motion.div
                    animate={{ x: [-8, -35], y: [-2, -14], scale: [0.6, 2], opacity: [0.8, 0] }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: 'easeOut', delay: 0.2 }}
                    className="w-2.5 h-2.5 rounded-full bg-slate-200/90 absolute"
                  />
                </div>
              </motion.div>

              {/* The Moving Asphalt Road */}
              <div className="w-full h-8 bg-slate-800 rounded-2xl relative overflow-hidden shadow-inner flex items-center mt-[-10px] border-t-2 border-slate-700">
                {/* Dashed white road line moving fast */}
                <motion.div
                  animate={{ x: [0, -60] }}
                  transition={{ duration: 0.4, repeat: Infinity, ease: 'linear' }}
                  className="flex gap-6 w-[200%] absolute left-0"
                >
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="w-10 h-1.5 bg-white/90 rounded-full shrink-0 shadow-xs" />
                  ))}
                </motion.div>
              </div>
            </div>

            {/* Travel Route & Progress Info */}
            <div className="w-full mt-6 flex flex-col items-center gap-3">
              {/* Animated Subtitle Badge */}
              <motion.div
                key={subtitle}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-white/80 shadow-xs text-xs sm:text-sm font-bold text-slate-800 text-center"
              >
                {subtitle}
              </motion.div>

              {/* Progress Bar with Mini Car Pin */}
              <div className="w-full relative flex flex-col gap-1.5 px-2">
                <div className="flex justify-between text-[11px] font-bold text-slate-600 px-1">
                  <span className="flex items-center gap-1">
                    🇦🇷 Córdoba
                  </span>
                  <span className="text-emerald-800 font-extrabold">
                    {progress}%
                  </span>
                  <span className="flex items-center gap-1">
                    Brasil 🇧🇷
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-200/80 backdrop-blur-xs rounded-full overflow-hidden p-0.5 shadow-inner relative">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 via-amber-400 to-emerald-500"
                    style={{ width: `${progress}%` }}
                    transition={{ ease: 'linear' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Caption & Dog Tag */}
          <div className="w-full max-w-lg flex flex-col items-center gap-1 pb-4 text-center">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span>Ariel</span>
              <span>•</span>
              <span>Jazmín</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-700">
                Bruno 🐶
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Rumbo a nuestra nueva vida en Brasil 🌴
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
