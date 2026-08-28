export type UserRole = 'student' | 'faculty' | 'admin';

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatar?: string;
  studentNumber?: string;
  facultyId?: string;
  employeeId?: string;
  department: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface StudentClassification {
  isIP: boolean;
  ipGroupName?: string;
  isPWD: boolean;
  pwdType?: 'Mobility Impairment' | 'Visual Impairment' | 'Hearing Impairment' | 'Neurodivergent / Learning Disability' | 'Chronic Health' | 'Other';
  pwdDetails?: string;
  requiresGroundFloor?: boolean;
  isShifter: boolean;
  previousProgram?: string;
  shifterReason?: string;
  isTransferee: boolean;
  previousSchool?: string;
  creditedUnits?: number;
  isWorkingStudent?: boolean;
  workingHours?: string;
}

export interface ReligionProfiling {
  religion: string;
  hasSchedulingObservance: boolean;
  observanceDetails?: string;
  restrictedDays?: string[]; // e.g., ['Saturday', 'Friday Evening', 'Sunday Morning']
  additionalNotes?: string;
}

export interface HealthMedicalProfiling {
  bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';
  hasMedicalCondition: boolean;
  allergies?: string;
  chronicConditions?: string;
  physicalMobilityAssistanceNeeded?: boolean;
  mobilityDetails?: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  authorizedForFacultyEvaluation: boolean; // Consent flag as required by data privacy & faculty evaluation
  medicalNotesForAdviser?: string;
}

export interface PersonalInfo {
  studentNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Non-Binary' | 'Prefer not to say';
  civilStatus: 'Single' | 'Married' | 'Widowed' | 'Separated';
  citizenship: string;
  personalEmail: string;
  universityEmail: string;
  contactNumber: string;
  residentialAddress: string;
  permanentAddress: string;
  guardianName: string;
  guardianContact: string;
  guardianRelationship: string;
}

export interface StudentProfile {
  studentNumber: string;
  userId: string;
  personalInfo: PersonalInfo;
  classifications: StudentClassification;
  religionProfiling: ReligionProfiling;
  healthMedicalProfiling: HealthMedicalProfiling;
  program: string;
  yearLevel: number;
  section?: string;
  enrollmentTerm: string;
  profileCompletionPercentage: number;
  isProfileLocked: boolean;
  lastUpdated: string;
  submittedForReview: boolean;
}

export interface SubjectGrade {
  code: string;
  title: string;
  units: number;
  isMajor: boolean;
  grade: number; // 1.0 to 5.0 (1.0 highest, 3.0 passing, 5.0 failed) or percentage
  remarks: 'Passed' | 'Failed' | 'Incomplete' | 'Dropped' | 'Ongoing';
  term: string;
  instructor?: string;
}

export type AcademicStatus =
  | 'Regular'
  | 'Academic Probation'
  | 'Shifter'
  | 'Transferee'
  | 'On Leave'
  | 'Dropped'
  | 'Graduating';

export interface AcademicRecord {
  studentNumber: string;
  program: string;
  curriculumYear: string;
  yearLevel: number;
  currentTerm: string;
  academicStatus: AcademicStatus;
  isUnderProbation: boolean;
  probationReason?: string;
  probationTermCount?: number;
  subjects: SubjectGrade[];
  overallGWA: number;
  majorSubjectGWA: number; // Automatically calculated based on major subjects only
  totalUnitsEarned: number;
  totalDeficientUnits: number;
  maxAllowedUnits: number;
  adviserAssigned?: string;
  lastEvaluatedAt?: string;
}

export type EvaluationStatus = 'Eligible' | 'Not Eligible' | 'For Review' | 'Pending';

export interface FacultyEvaluation {
  id: string;
  studentNumber: string;
  facultyId: string;
  facultyName: string;
  evaluationStatus: EvaluationStatus;
  remarks: string;
  recommendedSection?: string;
  recommendedMaxUnits?: number;
  sectionPlacementConsiderations: {
    religiousConsiderations: boolean;
    religiousNotes?: string;
    healthMobilityConsiderations: boolean;
    healthMobilityNotes?: string;
    academicSupportConsiderations: boolean;
    academicSupportNotes?: string;
    specialClassificationNotes?: string;
  };
  evaluatedAt: string;
  updatedAt?: string;
  isPublished: boolean;
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  category: 'AUTH' | 'PROFILE_UPDATE' | 'FACULTY_EVALUATION' | 'ACADEMIC_RECORD' | 'USER_MANAGEMENT' | 'SYSTEM_CONFIG';
  details: string;
  ipAddress?: string;
}

export interface SystemStats {
  totalStudents: number;
  totalFaculty: number;
  totalAdmins: number;
  evaluatedStudentsCount: number;
  pendingEvaluationsCount: number;
  probationCount: number;
  specialClassificationCount: {
    ip: number;
    pwd: number;
    shifters: number;
    transferees: number;
  };
  evaluationBreakdown: {
    eligible: number;
    notEligible: number;
    forReview: number;
    pending: number;
  };
}
