import type { FacultyRosterStudent } from './api';

// Percent cutoff used to flag attendance, submission, and running grade — policy assumption, adjust with registrar input.
export const ATTENTION_THRESHOLD = 75;

export const average = (values: Array<number | null>): number | null => {
  const numbers = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (numbers.length === 0) return null;
  return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(1));
};

export interface AttentionReason {
  label: string;
  variant: 'danger' | 'warning' | 'default';
}

export const buildAttentionRows = (students: FacultyRosterStudent[]) => students
  .map((student) => {
    const reasons: AttentionReason[] = [];
    const { attendanceRate, submissionRate, runningGrade } = student.metrics;
    if (student.isOnProbation) reasons.push({ label: 'Academic probation', variant: 'danger' });
    if (attendanceRate !== null && attendanceRate < ATTENTION_THRESHOLD) reasons.push({ label: `Attendance ${attendanceRate}%`, variant: 'warning' });
    if (submissionRate !== null && submissionRate < ATTENTION_THRESHOLD) reasons.push({ label: `Submission ${submissionRate}%`, variant: 'warning' });
    if (runningGrade !== null && runningGrade < ATTENTION_THRESHOLD) reasons.push({ label: `Grade ${runningGrade}%`, variant: 'warning' });
    if (runningGrade === null) reasons.push({ label: 'No records yet', variant: 'default' });
    return { student, reasons };
  })
  .filter((row) => row.reasons.length > 0)
  .sort((a, b) => b.reasons.length - a.reasons.length
    || (a.student.metrics.attendanceRate ?? 101) - (b.student.metrics.attendanceRate ?? 101)
    || a.student.lastName.localeCompare(b.student.lastName));

export const buildSectionRows = (students: FacultyRosterStudent[]) => {
  const groups = new Map<string, FacultyRosterStudent[]>();
  students.forEach((student) => {
    const key = student.section || 'Unassigned';
    groups.set(key, [...(groups.get(key) || []), student]);
  });
  return [...groups.entries()]
    .map(([name, members]) => ({
      name,
      count: members.length,
      attendance: average(members.map((student) => student.metrics.attendanceRate)),
      grade: average(members.map((student) => student.metrics.runningGrade)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};
