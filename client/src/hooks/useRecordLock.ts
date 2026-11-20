import { useEffect, useRef, useState } from 'react';
import {
  acquireRecordLock,
  fetchRecordLockStatus,
  releaseRecordLock,
  renewRecordLock,
  RecordLockStatus
} from '../lib/api';

interface UseRecordLockOptions {
  resourceType?: string;
  resourceId: string;
  autoAcquire?: boolean;
  leaseSeconds?: number;
  reason?: string;
}

export function useRecordLock({
  resourceType = 'STUDENT',
  resourceId,
  autoAcquire = true,
  leaseSeconds = 120,
  reason = 'Faculty Evaluation in Progress'
}: UseRecordLockOptions) {
  const [lockStatus, setLockStatus] = useState<RecordLockStatus | null>(null);
  const [lockToken, setLockToken] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const lockTokenRef = useRef<string | null>(null);

  lockTokenRef.current = lockToken;

  const checkStatus = async () => {
    if (!resourceId) return;
    try {
      const status = await fetchRecordLockStatus(resourceType, resourceId);
      setLockStatus(status);
      if (status.isOwner && status.lockToken) {
        setLockToken(status.lockToken);
        setIsOwner(true);
      } else if (!status.isLocked) {
        setIsOwner(false);
        setConflictMessage(null);
      }
    } catch {
      // Ignore network errors in status poll
    }
  };

  const acquire = async (mode: 'EXCLUSIVE' | 'SHARED' = 'EXCLUSIVE') => {
    if (!resourceId) return false;
    setLoading(true);
    setConflictMessage(null);
    try {
      const res = await acquireRecordLock(resourceType, resourceId, mode, leaseSeconds, reason);
      if (res.success && res.lockToken) {
        setLockToken(res.lockToken);
        setIsOwner(true);
        setConflictMessage(null);
        await checkStatus();
        return true;
      }
      if (res.status === 'CONFLICT' || res.code === 'CONCURRENCY_LOCK_CONFLICT') {
        const holder = res.conflict?.lockedBy?.fullName || res.conflict?.lockedBy?.username || 'another user';
        const msg = `Record is currently locked by ${holder} (${res.conflict?.remainingSeconds || 60}s lease remaining). Editing is temporarily blocked to prevent overwrite conflicts.`;
        setConflictMessage(msg);
        setIsOwner(false);
        await checkStatus();
        return false;
      }
      return false;
    } catch (err: any) {
      if (err?.message?.includes('locked by')) {
        setConflictMessage(err.message);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const release = async () => {
    const token = lockTokenRef.current;
    if (!resourceId || !token) return;
    try {
      await releaseRecordLock(resourceType, resourceId, token);
      setLockToken(null);
      setIsOwner(false);
      setConflictMessage(null);
      await checkStatus();
    } catch {
      // Non-fatal
    }
  };

  useEffect(() => {
    if (!resourceId) return;

    let active = true;

    const init = async () => {
      if (autoAcquire) {
        const acquired = await acquire('EXCLUSIVE');
        if (!acquired && active) {
          await checkStatus();
        }
      } else {
        await checkStatus();
      }
    };

    void init();

    // Heartbeat lock lease renewal every 45s while active owner
    const heartbeat = setInterval(() => {
      const currentToken = lockTokenRef.current;
      if (currentToken && resourceId) {
        renewRecordLock(resourceType, resourceId, currentToken, leaseSeconds).catch(() => {});
      }
    }, 45000);

    return () => {
      active = false;
      clearInterval(heartbeat);
      // Auto-release lock on unmount
      const token = lockTokenRef.current;
      if (token && resourceId) {
        releaseRecordLock(resourceType, resourceId, token).catch(() => {});
      }
    };
  }, [resourceId]);

  return {
    lockStatus,
    lockToken,
    isOwner,
    isLockedByOther: Boolean(lockStatus?.isLocked && !isOwner),
    conflictMessage,
    loading,
    acquire,
    release,
    checkStatus
  };
}
