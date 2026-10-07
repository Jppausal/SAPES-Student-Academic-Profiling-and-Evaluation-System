import type { AcademicTermRecord } from '../lib/api';

const calculateGwa = (records: AcademicTermRecord[], majorsOnly: boolean): number | null => {
  const subjects = records.flatMap((record) => record.subjects).filter((subject) =>
    (!majorsOnly || subject.isMajor) &&
    subject.status.toLowerCase() !== 'dropped' &&
    Number.isFinite(subject.grade) &&
    subject.grade > 0 &&
    Number.isFinite(subject.units) &&
    subject.units > 0
  );
  const units = subjects.reduce((sum, subject) => sum + subject.units, 0);
  if (!units) return null;
  return Number((subjects.reduce((sum, subject) => sum + subject.grade * subject.units, 0) / units).toFixed(2));
};

export const resolveAcademicGwas = (records: AcademicTermRecord[]) => ({
  overallGwa: calculateGwa(records, false),
  majorSubjectGwa: calculateGwa(records, true),
});

export const resolvePeriodGwas = (record?: AcademicTermRecord | null) => {
  if (!record) return { overallGwa: null, majorSubjectGwa: null };
  const calculated = resolveAcademicGwas([record]);
  return {
    overallGwa: typeof record.overallGwa === 'number' && Number.isFinite(record.overallGwa) && record.overallGwa > 0
      ? record.overallGwa
      : calculated.overallGwa,
    majorSubjectGwa: typeof record.majorSubjectGwa === 'number' && Number.isFinite(record.majorSubjectGwa) && record.majorSubjectGwa > 0
      ? record.majorSubjectGwa
      : calculated.majorSubjectGwa,
  };
};

export const formatAcademicGwa = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value.toFixed(2) : 'Not recorded';
