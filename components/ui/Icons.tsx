'use client';

import React from 'react';
import {
  Car,
  Package,
  Home,
  Palmtree,
  Heart,
  Dog,
  User,
  UserCheck,
  MapPin,
} from 'lucide-react';
import { StageIconName, Participant } from '@/lib/types';

export const StageIcon: React.FC<{ name: StageIconName; className?: string }> = ({
  name,
  className = 'w-4 h-4',
}) => {
  switch (name) {
    case 'car':
      return <Car className={className} />;
    case 'package':
      return <Package className={className} />;
    case 'home':
      return <Home className={className} />;
    case 'palmtree':
      return <Palmtree className={className} />;
    case 'heart':
      return <Heart className={className} />;
    default:
      return <MapPin className={className} />;
  }
};

export const ParticipantBadge: React.FC<{ participant: Participant; className?: string }> = ({
  participant,
  className = '',
}) => {
  if (participant === 'Bruno') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 ${className}`}
      >
        <Dog className="w-3.5 h-3.5 text-amber-700" />
        <span>Bruno</span>
      </span>
    );
  }

  if (participant === 'Ariel') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-950 border border-emerald-300 ${className}`}
      >
        <User className="w-3.5 h-3.5 text-emerald-700" />
        <span>Ariel</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-950 border border-teal-300 ${className}`}
    >
      <UserCheck className="w-3.5 h-3.5 text-teal-700" />
      <span>Jazmín</span>
    </span>
  );
};
