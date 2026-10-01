import { SubjectGrade, StudentProfile } from '../types';

/**
 * Calculates the Major-Subject GWA based on subjects flagged as major.
 * Formula: Sum(grade * units) / Sum(units) for all major subjects.
 */
export function calculateMajorSubjectGWA(subjects: SubjectGrade[]): number {
  const majorSubjects = subjects.filter(
    (s) => s.isMajor && s.remarks !== 'Dropped' && typeof s.grade === 'number' && s.grade > 0
  );

  if (majorSubjects.length === 0) return 0;

  const totalWeightedGrade = majorSubjects.reduce((sum, s) => sum + s.grade * s.units, 0);
  const totalUnits = majorSubjects.reduce((sum, s) => sum + s.units, 0);

  if (totalUnits === 0) return 0;
  return Number((totalWeightedGrade / totalUnits).toFixed(2));
}

/**
 * Calculates the overall GWA based on all graded academic subjects.
 */
export function calculateOverallGWA(subjects: SubjectGrade[]): number {
  const validSubjects = subjects.filter(
    (s) => s.remarks !== 'Dropped' && typeof s.grade === 'number' && s.grade > 0
  );

  if (validSubjects.length === 0) return 0;

  const totalWeightedGrade = validSubjects.reduce((sum, s) => sum + s.grade * s.units, 0);
  const totalUnits = validSubjects.reduce((sum, s) => sum + s.units, 0);

  if (totalUnits === 0) return 0;
  return Number((totalWeightedGrade / totalUnits).toFixed(2));
}

/**
 * Calculates the completion percentage of a student profile.
 */
export function calculateProfileCompletion(profile: Partial<StudentProfile>): number {
  if (!profile) return 0;

  let totalScore = 0;
  const maxScore = 100;

  // Personal Info (40%)
  const pi = profile.personalInfo;
  if (pi) {
    if (pi.firstName && pi.lastName) totalScore += 10;
    if (pi.personalEmail && pi.contactNumber) totalScore += 10;
    if (pi.dateOfBirth && pi.gender) totalScore += 5;
    if (pi.residentialAddress) totalScore += 5;
    if (pi.guardianName && pi.guardianContact) totalScore += 10;
  }

  // Classifications (20%)
  const cl = profile.classifications;
  if (cl) {
    totalScore += 20; // Completed the step
  }

  // Religion & Scheduling (20%)
  const rel = profile.religionProfiling;
  if (rel && rel.religion) {
    totalScore += 20;
  }

  // Health & Medical (20%)
  const hm = profile.healthMedicalProfiling;
  if (hm && hm.emergencyContactName && hm.emergencyContactPhone) {
    totalScore += 20;
  }

  return Math.min(maxScore, totalScore);
}

/**
 * Evaluates academic standing description
 */
export function getGradeQualityDescription(gwa: number): { label: string; color: string } {
  if (gwa === 0) return { label: 'No Grades Yet', color: 'text-slate-500' };
  if (gwa <= 1.25) return { label: 'President’s List / Outstanding', color: 'text-emerald-700 font-semibold' };
  if (gwa <= 1.75) return { label: 'Dean’s List / High Academic Honors', color: 'text-indigo-700 font-semibold' };
  if (gwa <= 2.25) return { label: 'Good Standing', color: 'text-blue-700' };
  if (gwa <= 3.00) return { label: 'Satisfactory Passing', color: 'text-amber-700' };
  return { label: 'Critical / Academic Deficiency', color: 'text-rose-700 font-semibold' };
}

/**
 * Formats date into readable string
 */
export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}
