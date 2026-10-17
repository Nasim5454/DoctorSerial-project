import React from 'react';
import { Clock, Megaphone, Stethoscope, CheckCircle2, XCircle, UserX } from 'lucide-react';
import type { QueueStatus } from '../types/index.js';

interface Props {
  status: QueueStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const QueueStatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  switch (status) {
    case 'Waiting':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 ${sizeClasses[size]}`}
        >
          <Clock size={iconSizes[size]} className="text-amber-600 animate-spin-slow" />
          Waiting
        </span>
      );

    case 'Called':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-purple-50 text-purple-700 ring-1 ring-purple-600/30 animate-pulse ${sizeClasses[size]}`}
        >
          <Megaphone size={iconSizes[size]} className="text-purple-600 animate-bounce" />
          Called
        </span>
      );

    case 'In Progress':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/30 ${sizeClasses[size]}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Stethoscope size={iconSizes[size]} className="text-emerald-600" />
          In Progress
        </span>
      );

    case 'Completed':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 ${sizeClasses[size]}`}
        >
          <CheckCircle2 size={iconSizes[size]} className="text-blue-600" />
          Completed
        </span>
      );

    case 'Cancelled':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 ${sizeClasses[size]}`}
        >
          <XCircle size={iconSizes[size]} className="text-rose-600" />
          Cancelled
        </span>
      );

    case 'No Show':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-zinc-100 text-zinc-600 ring-1 ring-zinc-500/20 ${sizeClasses[size]}`}
        >
          <UserX size={iconSizes[size]} className="text-zinc-500" />
          No Show
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center rounded-md bg-zinc-100 text-zinc-700 ${sizeClasses[size]}`}>
          {status}
        </span>
      );
  }
};
