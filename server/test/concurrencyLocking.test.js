const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const RecordLock = require('../models/RecordLock');
const AuditLog = require('../models/AuditLog');
const {
  isLockCompatible,
  acquireLock,
  releaseLock,
  checkLockStatus,
  renewLock,
  verifyLockForWrite
} = require('../utils/lockManager');

function setupLockMock(t) {
  const activeLocks = [];

  t.mock.method(AuditLog, 'create', async (doc) => doc);

  t.mock.method(RecordLock, 'find', (filter) => ({
    lean: async () => {
      const now = new Date();
      return activeLocks.filter((l) => {
        if (filter.resourceType && l.resourceType !== filter.resourceType) return false;
        if (filter.resourceId && l.resourceId !== filter.resourceId) return false;
        if (filter.expiresAt?.$gt && l.expiresAt <= now) return false;
        return true;
      });
    }
  }));

  t.mock.method(RecordLock, 'findOne', (filter) => ({
    lean: async () => {
      const now = new Date();
      return activeLocks.find((l) => {
        if (filter.resourceType && l.resourceType !== filter.resourceType) return false;
        if (filter.resourceId && l.resourceId !== filter.resourceId) return false;
        if (filter.lockToken && l.lockToken !== filter.lockToken) return false;
        if (filter['lockedBy.userId'] && String(l.lockedBy?.userId) !== String(filter['lockedBy.userId'])) return false;
        return true;
      }) || null;
    }
  }));

  t.mock.method(RecordLock, 'create', async (doc) => {
    const record = { ...doc, _id: new mongoose.Types.ObjectId() };
    activeLocks.push(record);
    return record;
  });

  t.mock.method(RecordLock, 'deleteOne', async (filter) => {
    const idx = activeLocks.findIndex((l) => String(l._id) === String(filter._id));
    if (idx !== -1) activeLocks.splice(idx, 1);
    return { deletedCount: 1 };
  });

  t.mock.method(RecordLock, 'deleteMany', async (filter) => {
    const now = new Date();
    let count = 0;
    for (let i = activeLocks.length - 1; i >= 0; i--) {
      const l = activeLocks[i];
      if (filter.resourceType && l.resourceType !== filter.resourceType) continue;
      if (filter.resourceId && l.resourceId !== filter.resourceId) continue;
      if (filter.expiresAt?.$lte && l.expiresAt <= now) {
        activeLocks.splice(i, 1);
        count++;
      }
    }
    return { deletedCount: count };
  });

  t.mock.method(RecordLock, 'updateOne', async (filter, update) => {
    const lock = activeLocks.find((l) => String(l._id) === String(filter._id));
    if (lock && update.$set) Object.assign(lock, update.$set);
    return { modifiedCount: 1 };
  });

  t.mock.method(RecordLock, 'findOneAndUpdate', (filter, update) => ({
    lean: async () => {
      const lock = activeLocks.find((l) => l.lockToken === filter.lockToken);
      if (lock && update.$set) {
        Object.assign(lock, update.$set);
        return lock;
      }
      return null;
    }
  }));

  return { activeLocks };
}

test('Lock Compatibility Matrix follows textbook S-Lock and X-Lock rules', () => {
  // None + S -> Grant
  assert.equal(isLockCompatible(null, 'SHARED'), true);
  // None + X -> Grant
  assert.equal(isLockCompatible(null, 'EXCLUSIVE'), true);
  // S + S -> Grant (Shared concurrent reads permitted)
  assert.equal(isLockCompatible('SHARED', 'SHARED'), true);
  // S + X -> Conflict (Exclusive write blocked by active shared read)
  assert.equal(isLockCompatible('SHARED', 'EXCLUSIVE'), false);
  // X + S -> Conflict (Shared read blocked by active exclusive write)
  assert.equal(isLockCompatible('EXCLUSIVE', 'SHARED'), false);
  // X + X -> Conflict (Exclusive write blocked by active exclusive write)
  assert.equal(isLockCompatible('EXCLUSIVE', 'EXCLUSIVE'), false);
});

test('acquireLock grants exclusive lock and rejects concurrent exclusive request', async (t) => {
  setupLockMock(t);

  const userA = { userId: new mongoose.Types.ObjectId(), username: 'prof_a', role: 'faculty', fullName: 'Prof A' };
  const userB = { userId: new mongoose.Types.ObjectId(), username: 'prof_b', role: 'faculty', fullName: 'Prof B' };

  // 1. User A acquires Exclusive Lock on Student 2023-0001
  const lockA = await acquireLock({
    resourceType: 'STUDENT',
    resourceId: '2023-0001',
    lockMode: 'EXCLUSIVE',
    user: userA,
    durationSeconds: 60,
    reason: 'Grading evaluation'
  });

  assert.equal(lockA.success, true);
  assert.equal(lockA.lockMode, 'EXCLUSIVE');
  assert.ok(lockA.lockToken);
  assert.equal(lockA.remainingSeconds, 60);

  // 2. User B tries to acquire Exclusive Lock on the same student -> CONFLICT
  const lockB = await acquireLock({
    resourceType: 'STUDENT',
    resourceId: '2023-0001',
    lockMode: 'EXCLUSIVE',
    user: userB,
    durationSeconds: 60
  });

  assert.equal(lockB.success, false);
  assert.equal(lockB.status, 'CONFLICT');
  assert.equal(lockB.code, 'CONCURRENCY_LOCK_CONFLICT');
  assert.match(lockB.message, /currently locked by Prof A/);
  assert.ok(lockB.conflict.remainingSeconds > 0);

  // 3. Check status: shows locked by Prof A
  const status = await checkLockStatus('STUDENT', '2023-0001', userB);
  assert.equal(status.isLocked, true);
  assert.equal(status.isOwner, false);
  assert.equal(status.lockedBy.username, 'prof_a');

  // 4. User A releases the lock (Strict 2PL Shrinking Phase)
  const released = await releaseLock({
    resourceType: 'STUDENT',
    resourceId: '2023-0001',
    user: userA,
    lockToken: lockA.lockToken
  });
  assert.equal(released.success, true);

  // 5. User B can now acquire the lock
  const lockBRetry = await acquireLock({
    resourceType: 'STUDENT',
    resourceId: '2023-0001',
    lockMode: 'EXCLUSIVE',
    user: userB,
    durationSeconds: 60
  });
  assert.equal(lockBRetry.success, true);
});

test('Shared locks permit multiple readers simultaneously', async (t) => {
  setupLockMock(t);

  const user1 = { userId: new mongoose.Types.ObjectId(), username: 'reader_1', role: 'faculty' };
  const user2 = { userId: new mongoose.Types.ObjectId(), username: 'reader_2', role: 'faculty' };
  const writer = { userId: new mongoose.Types.ObjectId(), username: 'writer_1', role: 'faculty' };

  // Both user 1 and user 2 acquire SHARED locks
  const s1 = await acquireLock({ resourceType: 'STUDENT', resourceId: '2023-0002', lockMode: 'SHARED', user: user1 });
  const s2 = await acquireLock({ resourceType: 'STUDENT', resourceId: '2023-0002', lockMode: 'SHARED', user: user2 });

  assert.equal(s1.success, true);
  assert.equal(s2.success, true);

  // Writer trying to acquire EXCLUSIVE lock is blocked by the active SHARED locks
  const x = await acquireLock({ resourceType: 'STUDENT', resourceId: '2023-0002', lockMode: 'EXCLUSIVE', user: writer });
  assert.equal(x.success, false);
  assert.equal(x.status, 'CONFLICT');
});

test('Lock auto-expires after lease duration (deadlock & orphan prevention)', async (t) => {
  const { activeLocks } = setupLockMock(t);

  const user = { userId: new mongoose.Types.ObjectId(), username: 'quick_lock', role: 'faculty' };
  const user2 = { userId: new mongoose.Types.ObjectId(), username: 'waiting_user', role: 'faculty' };

  // Acquire lock
  const lock = await acquireLock({
    resourceType: 'STUDENT',
    resourceId: '2023-0003',
    lockMode: 'EXCLUSIVE',
    user,
    durationSeconds: 10
  });
  assert.equal(lock.success, true);

  // Manually backdate expiresAt in activeLocks to simulate lease expiration
  const found = activeLocks.find((l) => l.lockToken === lock.lockToken);
  assert.ok(found);
  found.expiresAt = new Date(Date.now() - 5000);

  // Status check should now report unlocked
  const status = await checkLockStatus('STUDENT', '2023-0003', user2);
  assert.equal(status.isLocked, false);

  // User 2 can now acquire lock without conflict
  const lock2 = await acquireLock({
    resourceType: 'STUDENT',
    resourceId: '2023-0003',
    lockMode: 'EXCLUSIVE',
    user: user2
  });
  assert.equal(lock2.success, true);
});

test('verifyLockForWrite blocks unauthorized concurrent writes with HTTP 423', async (t) => {
  setupLockMock(t);

  const owner = { userId: new mongoose.Types.ObjectId(), username: 'owner_prof', role: 'faculty', fullName: 'Owner Prof' };
  const competitor = { userId: new mongoose.Types.ObjectId(), username: 'comp_prof', role: 'faculty', fullName: 'Competitor Prof' };

  // Owner holds lock
  await acquireLock({
    resourceType: 'STUDENT',
    resourceId: '2023-0004',
    lockMode: 'EXCLUSIVE',
    user: owner,
    reason: 'Active evaluation'
  });

  // Competitor tries to perform write operation
  const writeCheck = await verifyLockForWrite('STUDENT', '2023-0004', competitor);
  assert.equal(writeCheck.allowed, false);
  assert.equal(writeCheck.status, 423);
  assert.equal(writeCheck.code, 'CONCURRENCY_LOCK_CONFLICT');
  assert.match(writeCheck.message, /currently locked by Owner Prof/);

  // Owner is allowed to write
  const ownerCheck = await verifyLockForWrite('STUDENT', '2023-0004', owner);
  assert.equal(ownerCheck.allowed, true);
});

test('Lock renewal extends active lease duration', async (t) => {
  setupLockMock(t);

  const user = { userId: new mongoose.Types.ObjectId(), username: 'renew_prof', role: 'faculty' };

  const initial = await acquireLock({
    resourceType: 'STUDENT',
    resourceId: '2023-0005',
    lockMode: 'EXCLUSIVE',
    user,
    durationSeconds: 60
  });

  const renewed = await renewLock({
    resourceType: 'STUDENT',
    resourceId: '2023-0005',
    lockToken: initial.lockToken,
    durationSeconds: 180
  });

  assert.equal(renewed.success, true);
  assert.equal(renewed.remainingSeconds, 180);
});
