import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ProfileProgressBarProps {
  percentage: number;
  className?: string;
  showLabel?: boolean;
}

export const ProfileProgressBar: React.FC<ProfileProgressBarProps> = ({
  percentage,
  className = '',
  showLabel = true,
}) => {
  const isComplete = percentage >= 100;

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
          <span className="flex items-center gap-1.5 text-slate-700">
            {isComplete ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600" />
            )}
            Student Profile Completion Status
          </span>
          <span
            className={`font-semibold ${
              isComplete
                ? 'text-emerald-700'
                : percentage >= 70
                ? 'text-indigo-700'
                : 'text-amber-700'
            }`}
          >
            {percentage}% {isComplete ? '• Ready for Advisement' : '• Incomplete'}
          </span>
        </div>
      )}
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isComplete
              ? 'bg-emerald-500'
              : percentage >= 70
              ? 'bg-indigo-600'
              : 'bg-amber-500'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
};
