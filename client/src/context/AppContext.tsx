import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserAccount,
  UserRole,
  StudentProfile,
  AcademicRecord,
  FacultyEvaluation,
  SystemAuditLog,
  SubjectGrade,
  AcademicStatus,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_STUDENT_PROFILES,
  INITIAL_ACADEMIC_RECORDS,
  INITIAL_EVALUATIONS,
  INITIAL_AUDIT_LOGS,
} from '../mock/initialData';
import {
  calculateMajorSubjectGWA,
  calculateOverallGWA,
  calculateProfileCompletion,
} from '../utils/academicCalculators';
import { checkServerHealth, ServerStatus } from '../lib/api';

interface AppContextType {
  serverStatus: ServerStatus;
  currentUser: UserAccount | null;
  users: UserAccount[];
  students: StudentProfile[];
  academicRecords: AcademicRecord[];
  evaluations: FacultyEvaluation[];
  auditLogs: SystemAuditLog[];
  login: (username: string, role?: UserRole) => boolean;
  logout: () => void;
  switchUser: (userId: string) => void;
  updateStudentProfile: (studentNumber: string, updatedProfile: Partial<StudentProfile>) => void;
  submitProfileForReview: (studentNumber: string) => void;
  saveFacultyEvaluation: (evaluationData: Omit<FacultyEvaluation, 'id' | 'evaluatedAt'>) => void;
  updateAcademicRecord: (studentNumber: string, updates: Partial<AcademicRecord>) => void;
  toggleAcademicProbation: (studentNumber: string, isProbation: boolean, reason?: string) => void;
  updateAcademicStatus: (studentNumber: string, newStatus: AcademicStatus) => void;
  addSubjectGrade: (studentNumber: string, newSubject: SubjectGrade) => void;
  updateSubjectGrade: (
    studentNumber: string,
    subjectCode: string,
    updates: Partial<SubjectGrade>
  ) => void;
  deleteSubjectGrade: (studentNumber: string, subjectCode: string) => void;
  createUserAccount: (accountData: Omit<UserAccount, 'id' | 'createdAt'>) => void;
  updateUserAccount: (userId: string, updates: Partial<UserAccount>) => void;
  toggleUserActiveStatus: (userId: string) => void;
  deactivateUserAccount: (userId: string) => void;
  reactivateUserAccount: (userId: string) => void;
  addAuditLog: (action: string, category: SystemAuditLog['category'], details: string) => void;
  resetAllData: () => void;
  currentStudentProfile: StudentProfile | null;
  currentAcademicRecord: AcademicRecord | null;
  currentEvaluation: FacultyEvaluation | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USERS: 'seasms_users_v1',
  STUDENTS: 'seasms_students_v1',
  ACADEMICS: 'seasms_academics_v1',
  EVALUATIONS: 'seasms_evaluations_v1',
  LOGS: 'seasms_audit_logs_v1',
  CURRENT_USER_ID: 'seasms_current_user_id_v1',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [serverStatus, setServerStatus] = useState<ServerStatus>('checking');

  useEffect(() => {
    checkServerHealth().then((isOnline) => setServerStatus(isOnline ? 'online' : 'offline'));
  }, []);

  // Load initial state from LocalStorage or seed data
  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [students, setStudents] = useState<StudentProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    return saved ? JSON.parse(saved) : INITIAL_STUDENT_PROFILES;
  });

  const [academicRecords, setAcademicRecords] = useState<AcademicRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACADEMICS);
    return saved ? JSON.parse(saved) : INITIAL_ACADEMIC_RECORDS;
  });

  const [evaluations, setEvaluations] = useState<FacultyEvaluation[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EVALUATIONS);
    return saved ? JSON.parse(saved) : INITIAL_EVALUATIONS;
  });

  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    return saved || 'usr-student-1'; // Default to first student for immediate rich preview
  });

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACADEMICS, JSON.stringify(academicRecords));
  }, [academicRecords]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EVALUATIONS, JSON.stringify(evaluations));
  }, [evaluations]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    }
  }, [currentUserId]);

  const currentUser = users.find((u) => u.id === currentUserId) || null;

  // Helper to add audit log
  const addAuditLog = (
    action: string,
    category: SystemAuditLog['category'],
    details: string
  ) => {
    const newLog: SystemAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || 'sys-anon',
      userName: currentUser?.fullName || 'Anonymous / Guest',
      userRole: currentUser?.role || 'student',
      action,
      category,
      details,
      ipAddress: '192.168.1.105',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const login = (username: string, preferredRole?: UserRole): boolean => {
    const user = users.find(
      (u) =>
        (u.username.toLowerCase() === username.toLowerCase() ||
          u.email.toLowerCase() === username.toLowerCase() ||
          (u.studentNumber && u.studentNumber === username)) &&
        (!preferredRole || u.role === preferredRole)
    );

    if (user && user.isActive) {
      setCurrentUserId(user.id);
      // Update last login
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, lastLogin: new Date().toISOString() } : u))
      );
      addAuditLog('USER_LOGIN', 'AUTH', `${user.fullName} (${user.role.toUpperCase()}) logged in.`);
      return true;
    }
    return false;
  };

  const logout = () => {
    if (currentUser) {
      addAuditLog(
        'USER_LOGOUT',
        'AUTH',
        `${currentUser.fullName} (${currentUser.role.toUpperCase()}) logged out.`
      );
    }
    setCurrentUserId(null);
  };

  const switchUser = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser) {
      setCurrentUserId(userId);
      addAuditLog(
        'USER_ROLE_SWITCH',
        'AUTH',
        `Switched session to ${targetUser.fullName} (${targetUser.role.toUpperCase()}).`
      );
    }
  };

  const updateStudentProfile = (
    studentNumber: string,
    updatedData: Partial<StudentProfile>
  ) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.studentNumber === studentNumber) {
          const merged: StudentProfile = {
            ...s,
            ...updatedData,
            personalInfo: { ...s.personalInfo, ...(updatedData.personalInfo || {}) },
            classifications: { ...s.classifications, ...(updatedData.classifications || {}) },
            religionProfiling: {
              ...s.religionProfiling,
              ...(updatedData.religionProfiling || {}),
            },
            healthMedicalProfiling: {
              ...s.healthMedicalProfiling,
              ...(updatedData.healthMedicalProfiling || {}),
            },
            lastUpdated: new Date().toISOString(),
          };
          merged.profileCompletionPercentage = calculateProfileCompletion(merged);
          return merged;
        }
        return s;
      })
    );

    addAuditLog(
      'STUDENT_PROFILE_UPDATED',
      'PROFILE_UPDATE',
      `Updated student profile for student #${studentNumber}.`
    );
  };

  const submitProfileForReview = (studentNumber: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.studentNumber === studentNumber) {
          return {
            ...s,
            submittedForReview: true,
            lastUpdated: new Date().toISOString(),
          };
        }
        return s;
      })
    );

    addAuditLog(
      'PROFILE_SUBMITTED_FOR_REVIEW',
      'PROFILE_UPDATE',
      `Student #${studentNumber} completed and submitted profile for enrollment review.`
    );
  };

  const saveFacultyEvaluation = (
    evaluationData: Omit<FacultyEvaluation, 'id' | 'evaluatedAt'>
  ) => {
    const now = new Date().toISOString();
    const existingIndex = evaluations.findIndex(
      (e) => e.studentNumber === evaluationData.studentNumber
    );

    let finalId = `eval-${Date.now()}`;
    if (existingIndex >= 0) {
      finalId = evaluations[existingIndex].id;
      const updatedList = [...evaluations];
      updatedList[existingIndex] = {
        ...updatedList[existingIndex],
        ...evaluationData,
        updatedAt: now,
      };
      setEvaluations(updatedList);
    } else {
      const newEval: FacultyEvaluation = {
        ...evaluationData,
        id: finalId,
        evaluatedAt: now,
      };
      setEvaluations((prev) => [newEval, ...prev]);
    }

    // Also update Academic Record last evaluated stamp
    setAcademicRecords((prev) =>
      prev.map((rec) =>
        rec.studentNumber === evaluationData.studentNumber
          ? {
              ...rec,
              lastEvaluatedAt: now,
              adviserAssigned: evaluationData.facultyName,
              maxAllowedUnits: evaluationData.recommendedMaxUnits || rec.maxAllowedUnits,
            }
          : rec
      )
    );

    addAuditLog(
      'FACULTY_EVALUATION_RECORDED',
      'FACULTY_EVALUATION',
      `Faculty ${evaluationData.facultyName} evaluated student #${evaluationData.studentNumber} as [${evaluationData.evaluationStatus}]. Remarks: ${evaluationData.remarks.substring(0, 60)}...`
    );
  };

  const updateAcademicRecord = (
    studentNumber: string,
    updates: Partial<AcademicRecord>
  ) => {
    setAcademicRecords((prev) =>
      prev.map((rec) => {
        if (rec.studentNumber === studentNumber) {
          const updated = { ...rec, ...updates };
          // re-calculate GWAs if subjects were touched
          if (updates.subjects) {
            updated.majorSubjectGWA = calculateMajorSubjectGWA(updates.subjects);
            updated.overallGWA = calculateOverallGWA(updates.subjects);
          }
          return updated;
        }
        return rec;
      })
    );

    addAuditLog(
      'ACADEMIC_RECORD_UPDATED',
      'ACADEMIC_RECORD',
      `Updated academic record for student #${studentNumber}.`
    );
  };

  const toggleAcademicProbation = (
    studentNumber: string,
    isProbation: boolean,
    reason?: string
  ) => {
    setAcademicRecords((prev) =>
      prev.map((rec) => {
        if (rec.studentNumber === studentNumber) {
          return {
            ...rec,
            isUnderProbation: isProbation,
            academicStatus: isProbation ? 'Academic Probation' : 'Regular',
            probationReason: isProbation ? (reason || 'Academic deficiency noted') : undefined,
            probationTermCount: isProbation ? (rec.probationTermCount ? rec.probationTermCount + 1 : 1) : 0,
            maxAllowedUnits: isProbation ? 15 : 23,
          };
        }
        return rec;
      })
    );

    addAuditLog(
      isProbation ? 'ACADEMIC_PROBATION_FLAGGED' : 'ACADEMIC_PROBATION_CLEARED',
      'ACADEMIC_RECORD',
      `${isProbation ? 'Placed on Academic Probation' : 'Cleared from Probation'} for student #${studentNumber}. Reason: ${reason || 'N/A'}`
    );
  };

  const updateAcademicStatus = (
    studentNumber: string,
    newStatus: AcademicStatus
  ) => {
    setAcademicRecords((prev) =>
      prev.map((rec) =>
        rec.studentNumber === studentNumber
          ? {
              ...rec,
              academicStatus: newStatus,
              isUnderProbation: newStatus === 'Academic Probation',
            }
          : rec
      )
    );

    addAuditLog(
      'ACADEMIC_STATUS_CHANGED',
      'ACADEMIC_RECORD',
      `Student #${studentNumber} status changed to ${newStatus}.`
    );
  };

  const addSubjectGrade = (studentNumber: string, newSubject: SubjectGrade) => {
    setAcademicRecords((prev) =>
      prev.map((rec) => {
        if (rec.studentNumber === studentNumber) {
          const subjects = [...rec.subjects, newSubject];
          return {
            ...rec,
            subjects,
            majorSubjectGWA: calculateMajorSubjectGWA(subjects),
            overallGWA: calculateOverallGWA(subjects),
            totalUnitsEarned:
              newSubject.remarks === 'Passed'
                ? rec.totalUnitsEarned + newSubject.units
                : rec.totalUnitsEarned,
          };
        }
        return rec;
      })
    );

    addAuditLog(
      'SUBJECT_GRADE_ADDED',
      'ACADEMIC_RECORD',
      `Added course ${newSubject.code} (${newSubject.title}) for student #${studentNumber}.`
    );
  };

  const updateSubjectGrade = (
    studentNumber: string,
    subjectCode: string,
    updates: Partial<SubjectGrade>
  ) => {
    setAcademicRecords((prev) =>
      prev.map((rec) => {
        if (rec.studentNumber === studentNumber) {
          const subjects = rec.subjects.map((s) =>
            s.code === subjectCode ? { ...s, ...updates } : s
          );
          return {
            ...rec,
            subjects,
            majorSubjectGWA: calculateMajorSubjectGWA(subjects),
            overallGWA: calculateOverallGWA(subjects),
          };
        }
        return rec;
      })
    );

    addAuditLog(
      'SUBJECT_GRADE_MODIFIED',
      'ACADEMIC_RECORD',
      `Modified grade for ${subjectCode} in student #${studentNumber} record.`
    );
  };

  const deleteSubjectGrade = (studentNumber: string, subjectCode: string) => {
    setAcademicRecords((prev) =>
      prev.map((rec) => {
        if (rec.studentNumber === studentNumber) {
          const subjects = rec.subjects.filter((s) => s.code !== subjectCode);
          return {
            ...rec,
            subjects,
            majorSubjectGWA: calculateMajorSubjectGWA(subjects),
            overallGWA: calculateOverallGWA(subjects),
          };
        }
        return rec;
      })
    );

    addAuditLog(
      'SUBJECT_GRADE_DELETED',
      'ACADEMIC_RECORD',
      `Removed course ${subjectCode} from student #${studentNumber}.`
    );
  };

  const createUserAccount = (
    accountData: Omit<UserAccount, 'id' | 'createdAt'>
  ) => {
    const newUser: UserAccount = {
      ...accountData,
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);

    // If student, initialize profile and academic record
    if (newUser.role === 'student' && newUser.studentNumber) {
      const newProfile: StudentProfile = {
        studentNumber: newUser.studentNumber,
        userId: newUser.id,
        program: 'Bachelor of Science in Information Technology',
        yearLevel: 1,
        enrollmentTerm: '1st Semester, A.Y. 2026-2027',
        profileCompletionPercentage: 35,
        isProfileLocked: false,
        lastUpdated: new Date().toISOString(),
        submittedForReview: false,
        personalInfo: {
          studentNumber: newUser.studentNumber,
          firstName: newUser.fullName.split(' ')[0] || 'Firstname',
          lastName: newUser.fullName.split(' ').slice(1).join(' ') || 'Lastname',
          dateOfBirth: '2005-01-01',
          gender: 'Male',
          civilStatus: 'Single',
          citizenship: 'Filipino',
          personalEmail: newUser.email,
          universityEmail: newUser.email,
          contactNumber: '+63 900 000 0000',
          residentialAddress: '',
          permanentAddress: '',
          guardianName: '',
          guardianContact: '',
          guardianRelationship: '',
        },
        classifications: {
          isIP: false,
          isPWD: false,
          isShifter: false,
          isTransferee: false,
          isWorkingStudent: false,
        },
        religionProfiling: {
          religion: 'Roman Catholic',
          hasSchedulingObservance: false,
        },
        healthMedicalProfiling: {
          bloodType: 'Unknown',
          hasMedicalCondition: false,
          emergencyContactName: '',
          emergencyContactRelationship: '',
          emergencyContactPhone: '',
          authorizedForFacultyEvaluation: true,
        },
      };
      setStudents((prev) => [...prev, newProfile]);

      const newAcademic: AcademicRecord = {
        studentNumber: newUser.studentNumber,
        program: 'Bachelor of Science in Information Technology',
        curriculumYear: '2024 Curriculum',
        yearLevel: 1,
        currentTerm: '1st Semester, A.Y. 2026-2027',
        academicStatus: 'Regular',
        isUnderProbation: false,
        totalUnitsEarned: 0,
        totalDeficientUnits: 0,
        maxAllowedUnits: 23,
        overallGWA: 0,
        majorSubjectGWA: 0,
        subjects: [],
      };
      setAcademicRecords((prev) => [...prev, newAcademic]);
    }

    addAuditLog(
      'USER_ACCOUNT_CREATED',
      'USER_MANAGEMENT',
      `Created new ${newUser.role} account for ${newUser.fullName} (${newUser.username}).`
    );
  };

  const updateUserAccount = (userId: string, updates: Partial<UserAccount>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
    );
    addAuditLog(
      'USER_ACCOUNT_UPDATED',
      'USER_MANAGEMENT',
      `Updated user account details for ${userId}.`
    );
  };

  const toggleUserActiveStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newStatus = !u.isActive;
          addAuditLog(
            newStatus ? 'USER_ACCOUNT_ACTIVATED' : 'USER_ACCOUNT_DEACTIVATED',
            'USER_MANAGEMENT',
            `${newStatus ? 'Activated' : 'Deactivated'} account for ${u.fullName} (${u.role}).`
          );
          return { ...u, isActive: newStatus };
        }
        return u;
      })
    );
  };

  const deactivateUserAccount = (userId: string) => {
    const user = users.find((account) => account.id === userId);
    if (user?.isActive) toggleUserActiveStatus(userId);
  };

  const reactivateUserAccount = (userId: string) => {
    const user = users.find((account) => account.id === userId);
    if (user && !user.isActive) toggleUserActiveStatus(userId);
  };

  const resetAllData = () => {
    setUsers(INITIAL_USERS);
    setStudents(INITIAL_STUDENT_PROFILES);
    setAcademicRecords(INITIAL_ACADEMIC_RECORDS);
    setEvaluations(INITIAL_EVALUATIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setCurrentUserId('usr-student-1');
    localStorage.clear();
    addAuditLog('SYSTEM_DATA_RESET', 'SYSTEM_CONFIG', 'Reset all system data to initial baseline.');
  };

  // Derived current student info
  const currentStudentProfile =
    currentUser?.role === 'student' && currentUser.studentNumber
      ? students.find((s) => s.studentNumber === currentUser.studentNumber) || null
      : null;

  const currentAcademicRecord =
    currentUser?.role === 'student' && currentUser.studentNumber
      ? academicRecords.find((r) => r.studentNumber === currentUser.studentNumber) || null
      : null;

  const currentEvaluation =
    currentUser?.role === 'student' && currentUser.studentNumber
      ? evaluations.find((e) => e.studentNumber === currentUser.studentNumber) || null
      : null;

  return (
    <AppContext.Provider
      value={{
        serverStatus,
        currentUser,
        users,
        students,
        academicRecords,
        evaluations,
        auditLogs,
        login,
        logout,
        switchUser,
        updateStudentProfile,
        submitProfileForReview,
        saveFacultyEvaluation,
        updateAcademicRecord,
        toggleAcademicProbation,
        updateAcademicStatus,
        addSubjectGrade,
        updateSubjectGrade,
        deleteSubjectGrade,
        createUserAccount,
        updateUserAccount,
        toggleUserActiveStatus,
        deactivateUserAccount,
        reactivateUserAccount,
        addAuditLog,
        resetAllData,
        currentStudentProfile,
        currentAcademicRecord,
        currentEvaluation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
