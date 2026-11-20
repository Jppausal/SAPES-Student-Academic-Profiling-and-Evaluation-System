import React from 'react';
import { AlertCircle, Lock, RefreshCw, ShieldCheck, Unlock } from 'lucide-react';
import { RecordLockStatus } from '../../lib/api';

interface RecordLockBannerProps {
  lockStatus: RecordLockStatus | null;
  isOwner: boolean;
  isLockedByOther: boolean;
  conflictMessage: string | null;
  onRefresh: () => void;
  onRelease?: () => void;
  onRetryAcquire?: () => void;
}

export const RecordLockBanner: React.FC<RecordLockBannerProps> = ({
  lockStatus,
  isOwner,
  isLockedByOther,
  conflictMessage,
  onRefresh,
  onRelease,
  onRetryAcquire
}) => {
  if (isOwner) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2 text-xs text-emerald-800 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Lock className="h-3.5 w-3.5" />
          </span>
          <div>
            <span className="font-bold">Concurrency Lock Active:</span>{' '}
            <span>You hold an Exclusive write lock on this student record (Strict 2PL). Auto-renewing lease.</span>
          </div>
        </div>
        {onRelease && (
          <button
            type="button"
            onClick={onRelease}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
            title="Release lock manually before submitting"
          >
            <Unlock className="h-3 w-3" /> Release
          </button>
        )}
      </div>
    );
  }

  if (isLockedByOther) {
    const holder = lockStatus?.lockedBy?.fullName || lockStatus?.lockedBy?.username || 'Another faculty member';
    const remaining = lockStatus?.remainingSeconds || 60;

    return (
      <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-2xs">
        <div className="flex items-start gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-200/80 text-amber-800">
            <AlertCircle className="h-4 w-4" />
          </span>
          <div>
            <p className="font-bold text-amber-950">
              Record Locked by {holder} ({lockStatus?.lockMode || 'EXCLUSIVE'} Lock)
            </p>
            <p className="mt-0.5 text-amber-800 leading-relaxed">
              {conflictMessage || `This student's evaluation is actively being edited by ${holder}. Modifications are locked for ${remaining}s to prevent data corruption.`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {onRetryAcquire && (
            <button
              type="button"
              onClick={onRetryAcquire}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-2xs transition hover:bg-amber-100/70"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry Lock
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-100/60 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-200/60"
          >
            Check Status
          </button>
        </div>
      </div>
    );
  }

  return null;
};
