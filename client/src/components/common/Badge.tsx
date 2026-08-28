import React from 'react';
import { EvaluationStatus, AcademicStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'amber' | 'slate';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    amber: 'bg-amber-100 text-amber-900 border-amber-300',
    slate: 'bg-slate-800 text-white border-slate-700',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border whitespace-nowrap ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export const EvaluationBadge: React.FC<{ status: EvaluationStatus; size?: 'sm' | 'md' | 'lg' }> = ({
  status,
  size = 'md',
}) => {
  switch (status) {
    case 'Eligible':
      return (
        <Badge variant="success" size={size}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Eligible for Enrollment
        </Badge>
      );
    case 'Not Eligible':
      return (
        <Badge variant="danger" size={size}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Not Eligible / Hold
        </Badge>
      );
    case 'For Review':
      return (
        <Badge variant="warning" size={size}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          For Review / Incomplete
        </Badge>
      );
    default:
      return (
        <Badge variant="default" size={size}>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          Pending Evaluation
        </Badge>
      );
  }
};

export const AcademicStatusBadge: React.FC<{
  status: AcademicStatus;
  isProbation?: boolean;
  size?: 'sm' | 'md';
}> = ({ status, isProbation, size = 'sm' }) => {
  if (isProbation || status === 'Academic Probation') {
    return (
      <Badge variant="danger" size={size}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
        Academic Probation
      </Badge>
    );
  }

  switch (status) {
    case 'Regular':
      return (
        <Badge variant="info" size={size}>
          Regular Standing
        </Badge>
      );
    case 'Shifter':
      return (
        <Badge variant="purple" size={size}>
          Shifter
        </Badge>
      );
    case 'Transferee':
      return (
        <Badge variant="info" size={size}>
          Transferee
        </Badge>
      );
    case 'On Leave':
      return (
        <Badge variant="warning" size={size}>
          On Leave (LOA)
        </Badge>
      );
    case 'Dropped':
      return (
        <Badge variant="danger" size={size}>
          Dropped
        </Badge>
      );
    case 'Graduating':
      return (
        <Badge variant="success" size={size}>
          Graduating Senior
        </Badge>
      );
    default:
      return (
        <Badge variant="default" size={size}>
          {status}
        </Badge>
      );
  }
};
