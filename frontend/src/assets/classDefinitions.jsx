import React from 'react';
import { Target, Zap, ChevronsRight } from 'lucide-react';

// Centralized definition of player classes for easy access and management.
export const classes = {
  Archer: {
    name: 'Archer',
    description: 'Long reload, high reward.',
    stats: { reload: '7s', points: '70' },
    icon: <Target size={24} />,
    iconColor: 'text-green-400',
    color: 'border-green-500',
    bgColor: 'bg-green-500/10',
  },
  Shotgun: {
    name: 'Shotgun',
    description: 'Run n\' gun specialist.',
    stats: { reload: '4s', points: '40' },
    icon: <Zap size={24} />,
    iconColor: 'text-orange-400',
    color: 'border-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  Pistol: {
    name: 'Pistol',
    description: 'Fast and relentless.',
    stats: { reload: '1s', points: '10' },
    icon: <ChevronsRight size={24} />,
    iconColor: 'text-cyan-400',
    color: 'border-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
};

// An array version for easy mapping, if needed elsewhere.
export const classList = Object.values(classes);

