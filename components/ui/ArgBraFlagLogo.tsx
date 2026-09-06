'use client';

import React from 'react';

interface ArgBraFlagLogoProps {
  size?: number;
  className?: string;
}

export const ArgBraFlagLogo: React.FC<ArgBraFlagLogoProps> = ({ size = 36, className = '' }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-2xl overflow-hidden shadow-sm border border-slate-200/80 shrink-0 select-none ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id="argClip">
            <rect x="0" y="0" width="50" height="100" />
          </clipPath>
          <clipPath id="braClip">
            <rect x="50" y="0" width="50" height="100" />
          </clipPath>
        </defs>

        {/* --- LEFT HALF: ARGENTINA --- */}
        <g clipPath="url(#argClip)">
          {/* Celeste top */}
          <rect x="0" y="0" width="100" height="33.3" fill="#74ACDF" />
          {/* White middle */}
          <rect x="0" y="33.3" width="100" height="33.4" fill="#FFFFFF" />
          {/* Celeste bottom */}
          <rect x="0" y="66.7" width="100" height="33.3" fill="#74ACDF" />
          
          {/* Sol de Mayo (Argentina Sun on left edge of border) */}
          <circle cx="50" cy="50" r="12" fill="#F6B40E" />
          <circle cx="50" cy="50" r="8" fill="#85340A" opacity="0.15" />
          {/* Sun rays */}
          <path
            d="M 50 34 L 50 30 M 50 66 L 50 70 M 34 50 L 30 50 M 39 39 L 36 36 M 39 61 L 36 64"
            stroke="#F6B40E"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>

        {/* --- RIGHT HALF: BRASIL --- */}
        <g clipPath="url(#braClip)">
          {/* Green base */}
          <rect x="0" y="0" width="100" height="100" fill="#009C3B" />
          
          {/* Yellow Diamond (Losango Amarelo) */}
          <polygon points="50,15 90,50 50,85 10,50" fill="#FFDF00" />
          
          {/* Blue Globe (Círculo Azul) */}
          <circle cx="50" cy="50" r="18" fill="#002776" />
          
          {/* White Band across globe */}
          <path
            d="M 33 46 Q 50 54 67 48"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </g>

        {/* Subtle center dividing line */}
        <line
          x1="50"
          y1="0"
          x2="50"
          y2="100"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          opacity="0.8"
        />
      </svg>
    </div>
  );
};
