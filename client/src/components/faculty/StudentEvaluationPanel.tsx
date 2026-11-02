import React, { useEffect, useState } from 'react';
import {
  Activity,
  BookOpenCheck,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Download,
  FileClock,
  GraduationCap,
  HeartPulse,
  MessageSquareText,
  Plus,
  Save,
  Trash2,
  UserRound,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  CourseEvaluationProgress,
  FacultyStudentWorkspace,
  fetchFacultyStudentWorkspace,
  saveFacultyCourseEvaluation,
  saveStudentEvaluation,
} from '../../lib/api';
import { formatAcademicGwa, resolveAcademicGwas, resolvePeriodGwas } from '../../utils/mongoAcademicGwa';
import { formatStatusLabel } from '../../utils/formatStatusLabel';
import { StudentProfilePhoto } from '../common/StudentProfilePhoto';

type EvaluationTab = 'gradebook' | 'attendance' | 'remarks' | 'history';
type ProfileTab = 'information' | 'enrollment' | 'profiling';

const tabItems: Array<{ id: EvaluationTab; label: string; icon: typeof Activity }> = [
  { id: 'gradebook', label: 'Gradebook & Assessment Breakdown', icon: ClipboardList },
  { id: 'attendance', label: 'Attendance & Participation Log', icon: CalendarCheck2 },
  { id: 'remarks', label: 'Faculty Remarks & Rubrics', icon: MessageSquareText },
  { id: 'history', label: 'Academic History', icon: FileClock },
];

const profileTabItems: Array<{ id: ProfileTab; label: string; icon: typeof UserRound }> = [
  { id: 'information', label: 'Student Information', icon: UserRound },
  { id: 'enrollment', label: 'Enrollment & Classification', icon: GraduationCap },
  { id: 'profiling', label: 'Religion & Health Concerns', icon: HeartPulse },
];

const emptyProgress = (): CourseEvaluationProgress => ({
  academicYear: '2026-2027',
  semester: '1st Semester',
  assessments: [],
  attendanceLogs: [],
  rubricScores: [],
  facultyRemarks: [],
  internalNotes: '',
});

const profileValue = (value?: string | number | boolean | null) => (
  typeof value === 'boolean'
    ? value ? 'Yes' : 'No'
    : typeof value === 'number' || (typeof value === 'string' && value.trim())
      ? String(value)
      : 'Not provided'
);

const profileDate = (value?: string) => {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const formatAddress = (address?: FacultyStudentWorkspace['student']['addresses']['presentAddress']) => {
  const parts = [
    address?.street,
    address?.barangay,
    address?.municipality,
    address?.province,
    address?.region,
    address?.country,
    address?.zipCode,
  ].filter((part): part is string => Boolean(part?.trim()));
  return parts.length ? parts.join(', ') : 'Not provided';
};

const ProfileField: React.FC<{ label: string; value: React.ReactNode; highlight?: boolean }> = ({ label, value, highlight }) => highlight
  ? (
    <div className="min-w-0 rounded-lg border border-amber-300 bg-amber-50 p-3">
      <dt className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-amber-800">
        {label}
        <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">Needs consideration</span>
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-800">{value || 'Not provided'}</dd>
    </div>
  )
  : (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-800">{value || 'Not provided'}</dd>
    </div>
  );

interface StudentEvaluationPanelProps {
  institutionId: string;
  initialWorkspace?: FacultyStudentWorkspace;
  showStudentProfile?: boolean;
  showEvaluationDetails?: boolean;
}

export const StudentEvaluationPanel: React.FC<StudentEvaluationPanelProps> = ({
  institutionId,
  initialWorkspace,
  showStudentProfile = true,
  showEvaluationDetails = true,
}) => {
  const [workspace, setWorkspace] = useState<FacultyStudentWorkspace | null>(initialWorkspace || null);
  const [draft, setDraft] = useState<CourseEvaluationProgress | null>(initialWorkspace?.courseEvaluation || null);
  const [enrollmentEligibility, setEnrollmentEligibility] = useState<'eligible' | 'not_eligible' | null>(
    initialWorkspace?.facultyEvaluation?.evaluationStatus === 'eligible'
      || initialWorkspace?.facultyEvaluation?.evaluationStatus === 'not_eligible'
      ? initialWorkspace.facultyEvaluation.evaluationStatus
      : null
  );
  const [evaluationRemarks, setEvaluationRemarks] = useState(initialWorkspace?.facultyEvaluation?.remarks || '');
  const [evaluationOpen, setEvaluationOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<EvaluationTab>('gradebook');
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('information');
  const [loading, setLoading] = useState(!initialWorkspace);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    if (initialWorkspace) {
      setWorkspace(initialWorkspace);
      setDraft(initialWorkspace.courseEvaluation || emptyProgress());
      setEnrollmentEligibility(
        initialWorkspace.facultyEvaluation?.evaluationStatus === 'eligible'
          || initialWorkspace.facultyEvaluation?.evaluationStatus === 'not_eligible'
          ? initialWorkspace.facultyEvaluation.evaluationStatus
          : null
      );
      setEvaluationRemarks(initialWorkspace.facultyEvaluation?.remarks || '');
      setLoading(false);
      setError('');
      return () => { active = false; };
    }

    setLoading(true);
    setError('');
    fetchFacultyStudentWorkspace(institutionId)
      .then((result) => {
        if (!active) return;
        setWorkspace(result);
        setDraft(result.courseEvaluation || emptyProgress());
        setEnrollmentEligibility(
          result.facultyEvaluation?.evaluationStatus === 'eligible'
            || result.facultyEvaluation?.evaluationStatus === 'not_eligible'
            ? result.facultyEvaluation.evaluationStatus
            : null
        );
        setEvaluationRemarks(result.facultyEvaluation?.remarks || '');
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : 'Unable to load this student evaluation.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [institutionId, initialWorkspace]);

  const saveProgress = async (successMessage: string) => {
    if (!draft) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveFacultyCourseEvaluation(institutionId, draft);
      const updatedWorkspace = await fetchFacultyStudentWorkspace(institutionId);
      setWorkspace(updatedWorkspace);
      setDraft(updatedWorkspace.courseEvaluation);
      setMessage(successMessage);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save evaluation data.');
    } finally {
      setSaving(false);
    }
  };

  const saveEligibilityEvaluation = async () => {
    if (!enrollmentEligibility) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveStudentEvaluation(institutionId, {
        evaluationStatus: enrollmentEligibility,
        reasons: [],
        remarks: evaluationRemarks,
      });
      const updatedWorkspace = await fetchFacultyStudentWorkspace(institutionId);
      setWorkspace(updatedWorkspace);
      setDraft(updatedWorkspace.courseEvaluation);
      setEvaluationRemarks(updatedWorkspace.facultyEvaluation?.remarks || '');
      setEvaluationOpen(false);
      setMessage('Enrollment eligibility evaluation saved.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save the enrollment evaluation.');
    } finally {
      setSaving(false);
    }
  };

  const updateAssessment = (index: number, field: string, value: string | number | boolean) => {
    setDraft((current) => current ? {
      ...current,
      assessments: current.assessments.map((assessment, itemIndex) => (
        itemIndex === index ? { ...assessment, [field]: value } : assessment
      )),
    } : current);
  };

  const addAssessment = () => setDraft((current) => current ? {
    ...current,
    assessments: [...current.assessments, { title: '', category: 'quiz', score: 0, possiblePoints: 10, submitted: false }],
  } : current);

  const addAttendance = () => setDraft((current) => current ? {
    ...current,
    attendanceLogs: [...current.attendanceLogs, { date: new Date().toISOString().slice(0, 10), status: 'present', notes: '', excuseLetter: '' }],
  } : current);

  const addRubric = () => setDraft((current) => current ? {
    ...current,
    rubricScores: [...current.rubricScores, { competency: '', rating: 0, maxRating: 5, notes: '' }],
  } : current);

  const addRemark = () => setDraft((current) => current ? {
    ...current,
    facultyRemarks: [...current.facultyRemarks, { text: '', createdAt: new Date().toISOString() }],
  } : current);

  if (loading) {
    return <div role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Loading student evaluation…</div>;
  }
  if (!workspace || !draft) {
    return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error || 'The student evaluation could not be loaded.'}</p>;
  }

  const percent = (value: number | null) => value === null ? '—' : `${value}%`;
  const latestRecord = workspace.academicRecords[0];
  const fallbackPeriod = resolvePeriodGwas(latestRecord);
  const latestPeriod = workspace.latestAcademicPeriod || latestRecord ? {
    academicYear: workspace.latestAcademicPeriod?.academicYear || latestRecord?.academicYear || '',
    semester: workspace.latestAcademicPeriod?.semester || latestRecord?.semester || '',
    overallGwa: workspace.latestAcademicPeriod?.overallGwa ?? fallbackPeriod.overallGwa,
    majorSubjectGwa: workspace.latestAcademicPeriod?.majorSubjectGwa ?? fallbackPeriod.majorSubjectGwa,
  } : null;
  const historicalGwas = resolveAcademicGwas(workspace.academicRecords);
  const historicalOverall = workspace.overallGwa ?? historicalGwas.overallGwa;
  const studentName = [
    workspace.student.personalInformation.firstName,
    workspace.student.personalInformation.middleName,
    workspace.student.personalInformation.lastName,
    workspace.student.personalInformation.suffix,
  ].filter(Boolean).join(' ').trim();
  const studentStatus = workspace.student.academicStatus.isOnProbation
    ? 'Probationary'
    : (workspace.student.academicStatus.currentStatus || 'Not recorded')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  const religiousConsideration = workspace.student.religiousInformation.shareSpiritualSchedule === true;
  const healthConsideration = workspace.student.healthInformation.hasRelevantHealthConcern === true
    || workspace.student.healthInformation.accommodationRequired === true
    || Boolean(workspace.student.healthInformation.conditions?.length)
    || Boolean(workspace.student.healthInformation.allergyDetails?.trim())
    || Boolean(workspace.student.healthInformation.otherCondition?.trim());
  const hasPlacementConsideration = religiousConsideration || healthConsideration;
  const academicSubjects = workspace.academicRecords.flatMap((record) => record.subjects);
  const totalUnits = academicSubjects.reduce((total, subject) => total + Number(subject.units || 0), 0);
  const completedSubjects = academicSubjects.filter((subject) => subject.status.toLowerCase() === 'completed').length;

  const downloadAcademicRecords = () => {
    const document = new jsPDF();
    const pageWidth = document.internal.pageSize.getWidth();
    let cursorY = 20;
    const addLine = (text: string, size = 10, bold = false) => {
      document.setFont('helvetica', bold ? 'bold' : 'normal');
      document.setFontSize(size);
      const lines = document.splitTextToSize(text, pageWidth - 28);
      document.text(lines, 14, cursorY);
      cursorY += lines.length * (size * 0.5 + 2.5);
      if (cursorY > 275) {
        document.addPage();
        cursorY = 20;
      }
    };

    addLine('SAPES — Student Academic Record', 16, true);
    addLine(studentName || workspace.student.institutionId, 12, true);
    addLine(`Student ID: ${workspace.student.institutionId}`);
    addLine(`Program: ${profileValue(workspace.student.classification.program)} · Year ${workspace.student.yearLevel || '—'} · Section ${workspace.student.section}`);
    cursorY += 4;
    addLine('Summary', 12, true);
    addLine(`Total units: ${totalUnits}`);
    addLine(`Total subjects: ${academicSubjects.length}`);
    addLine(`Completed subjects: ${completedSubjects}`);
    addLine(`Academic status: ${studentStatus}`);
    addLine(`Cumulative overall GWA: ${formatAcademicGwa(historicalOverall)}`);
    cursorY += 4;

    workspace.academicRecords.forEach((record) => {
      addLine(`${record.academicYear} · ${record.semester}`, 11, true);
      addLine(`Overall GWA: ${formatAcademicGwa(resolvePeriodGwas(record).overallGwa)} · Major GWA: ${formatAcademicGwa(resolvePeriodGwas(record).majorSubjectGwa)}`);
      record.subjects.forEach((subject) => {
        addLine(`${subject.subjectCode} — ${subject.subjectName} · ${subject.units} units · Grade ${subject.grade.toFixed(2)} · ${formatStatusLabel(subject.status)}`);
      });
      cursorY += 3;
    });

    document.save(`sapes-academic-record-${workspace.student.institutionId}.pdf`);
  };

  const handleProfileTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = profileTabItems.findIndex(({ id }) => id === activeProfileTab);
    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % profileTabItems.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + profileTabItems.length) % profileTabItems.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = profileTabItems.length - 1;
    else return;

    event.preventDefault();
    const nextTab = profileTabItems[nextIndex];
    setActiveProfileTab(nextTab.id);
    document.getElementById(`student-profile-tab-${nextTab.id}`)?.focus();
  };

  return (
    <section aria-label="Student evaluation" className="space-y-4">
      {showStudentProfile && <section aria-label="Student profile" className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-5 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:p-6">
          <StudentProfilePhoto
            institutionId={workspace.student.institutionId}
            studentName={studentName || 'Student'}
            className="h-28 w-28 shrink-0 rounded-xl border border-slate-200 object-cover"
            fallback={<div aria-label="Student profile photo placeholder" className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                <div className="flex flex-col items-center gap-1">
                  <UserRound aria-hidden="true" className="h-9 w-9" />
                  <span className="text-[10px] font-medium">Profile photo</span>
                </div>
              </div>}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500">Student profile</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{studentName || workspace.student.institutionId}</h2>
            <p className="mt-1 break-all font-mono text-xs text-slate-500">{workspace.student.institutionId} · @{workspace.student.username}</p>
            <p className="mt-2 text-sm text-slate-600">
              {profileValue(workspace.student.classification.program)} · Year {workspace.student.yearLevel || '—'} · Section {workspace.student.section}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${workspace.student.academicStatus.isOnProbation ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>{studentStatus}</span>
              {workspace.student.classification.isIP && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">Indigenous Peoples</span>}
              {workspace.student.classification.isPWD && <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">Person with disability</span>}
              {workspace.student.classification.isShifter && <span className="rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700">Shifter</span>}
              {workspace.student.classification.isTransferee && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">Transferee</span>}
              {hasPlacementConsideration && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">Needs placement consideration</span>}
            </div>
          </div>
        </div>

        <div>
          <div role="tablist" aria-label="Student profile sections" className="flex overflow-x-auto border-b border-slate-200 px-2">
            {profileTabItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                id={`student-profile-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={activeProfileTab === id}
                aria-controls={`student-profile-panel-${id}`}
                tabIndex={activeProfileTab === id ? 0 : -1}
                onClick={() => setActiveProfileTab(id)}
                onKeyDown={handleProfileTabKeyDown}
                className={`flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition-colors sm:px-4 ${activeProfileTab === id ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {label}
                {id === 'profiling' && hasPlacementConsideration && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">Needs consideration</span>}
              </button>
            ))}
          </div>

          <div
            id="student-profile-panel-information"
            role="tabpanel"
            aria-labelledby="student-profile-tab-information"
            tabIndex={0}
            hidden={activeProfileTab !== 'information'}
            className="divide-y divide-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
          >
            <section className="p-5 sm:p-6">
              <h3 className="text-base font-bold text-slate-900">Personal information</h3>
              <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                <ProfileField label="First name" value={profileValue(workspace.student.personalInformation.firstName)} />
                <ProfileField label="Middle name" value={profileValue(workspace.student.personalInformation.middleName)} />
                <ProfileField label="Last name" value={profileValue(workspace.student.personalInformation.lastName)} />
                <ProfileField label="Suffix" value={profileValue(workspace.student.personalInformation.suffix)} />
                <ProfileField label="Date of birth" value={profileDate(workspace.student.personalInformation.birthDate)} />
                <ProfileField label="Place of birth" value={profileValue(workspace.student.personalInformation.birthPlace)} />
                <ProfileField label="Sex" value={profileValue(workspace.student.personalInformation.sex)} />
                <ProfileField label="Civil status" value={profileValue(workspace.student.personalInformation.civilStatus)} />
                <ProfileField label="Nationality" value={profileValue(workspace.student.personalInformation.nationality)} />
                <ProfileField label="Citizenship" value={profileValue(workspace.student.personalInformation.citizenship)} />
                <ProfileField label="Dual citizenship" value={profileValue(workspace.student.personalInformation.dualCitizenship)} />
                <ProfileField label="Foreigner" value={profileValue(workspace.student.personalInformation.isForeigner)} />
                <ProfileField label="Height" value={profileValue(workspace.student.personalInformation.height)} />
                <ProfileField label="Weight" value={profileValue(workspace.student.personalInformation.weight)} />
                <ProfileField label="Blood type" value={profileValue(workspace.student.personalInformation.bloodType)} />
                <ProfileField label="Minority group" value={profileValue(workspace.student.personalInformation.minority)} />
              </dl>
            </section>

            <section className="p-5 sm:p-6">
              <h3 className="text-base font-bold text-slate-900">Contact information</h3>
              <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                <ProfileField label="Mobile number" value={profileValue(workspace.student.contactInformation.mobileNumber)} />
                <ProfileField label="Alternate mobile" value={profileValue(workspace.student.contactInformation.alternateMobileNumber)} />
                <ProfileField label="Telephone" value={profileValue(workspace.student.contactInformation.telephoneNumber)} />
                <ProfileField label="Institutional email" value={profileValue(workspace.student.contactInformation.institutionalEmail)} />
                <ProfileField label="Alternate email" value={profileValue(workspace.student.contactInformation.alternateEmail)} />
              </dl>
            </section>

            <section className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">Addresses</h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <ProfileField label="Present address" value={formatAddress(workspace.student.addresses.presentAddress)} />
                  <ProfileField label="Home address" value={formatAddress(workspace.student.addresses.homeAddress)} />
                </dl>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Educational background</h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <ProfileField label="Previous school" value={profileValue(workspace.student.educationalBackground.previousSchool)} />
                  <ProfileField label="Senior high school" value={profileValue(workspace.student.educationalBackground.seniorHigh)} />
                  <ProfileField label="Junior high school" value={profileValue(workspace.student.educationalBackground.juniorHigh)} />
                  <ProfileField label="Elementary school" value={profileValue(workspace.student.educationalBackground.elementary)} />
                </dl>
              </div>
            </section>
          </div>

          <div
            id="student-profile-panel-enrollment"
            role="tabpanel"
            aria-labelledby="student-profile-tab-enrollment"
            tabIndex={0}
            hidden={activeProfileTab !== 'enrollment'}
            className="outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
          >
            <section className="p-5 sm:p-6">
              <h3 className="text-base font-bold text-slate-900">Enrollment and classification</h3>
              <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                <ProfileField label="Program" value={profileValue(workspace.student.classification.program)} />
                <ProfileField label="Course" value={profileValue(workspace.student.enrollmentInformation.course)} />
                <ProfileField label="Department" value={profileValue(workspace.student.enrollmentInformation.department)} />
                <ProfileField label="Level" value={profileValue(workspace.student.enrollmentInformation.level)} />
                <ProfileField label="Year level" value={profileValue(workspace.student.enrollmentInformation.yearLevel || workspace.student.yearLevel)} />
                <ProfileField label="Section" value={profileValue(workspace.student.section)} />
                <ProfileField label="Curriculum" value={profileValue(workspace.student.enrollmentInformation.curriculum)} />
                <ProfileField label="Student type" value={profileValue(workspace.student.enrollmentInformation.studentType || workspace.student.classification.studentType)} />
                <ProfileField label="Entry period" value={profileValue(workspace.student.enrollmentInformation.entryPeriod)} />
                <ProfileField label="Entry date" value={profileDate(workspace.student.enrollmentInformation.entryDate)} />
                <ProfileField label="Preferred modality" value={profileValue(workspace.student.enrollmentInformation.preferredModality)} />
                <ProfileField label="Campus" value={profileValue(workspace.student.enrollmentInformation.campus)} />
                <ProfileField label="Learner reference number" value={profileValue(workspace.student.enrollmentInformation.learnerReferenceNo)} />
                <ProfileField label="NSTP number" value={profileValue(workspace.student.enrollmentInformation.nstpNumber)} />
                <ProfileField label="Enrollment status" value={profileValue(workspace.student.enrollmentStatus.replace(/_/g, ' '))} />
                <ProfileField label="Academic status" value={studentStatus} />
                <ProfileField label="Indigenous Peoples classification" value={profileValue(workspace.student.classification.isIP)} />
                <ProfileField label="Person with disability classification" value={profileValue(workspace.student.classification.isPWD)} />
                <ProfileField label="Shifter classification" value={profileValue(workspace.student.classification.isShifter)} />
                <ProfileField label="Transferee classification" value={profileValue(workspace.student.classification.isTransferee)} />
                <ProfileField label="Indigenous group" value={profileValue(workspace.student.classification.indigenousGroup)} />
              </dl>
            </section>
          </div>

          <div
            id="student-profile-panel-profiling"
            role="tabpanel"
            aria-labelledby="student-profile-tab-profiling"
            tabIndex={0}
            hidden={activeProfileTab !== 'profiling'}
            className="outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
          >
            <section className="p-5 sm:p-6">
              <h3 className="text-base font-bold text-slate-900">Religion and health concerns</h3>
              <p className="mt-1 text-xs text-slate-500">Highlighted items require consideration when evaluating this student's section placement.</p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ProfileField label="Religion" value={profileValue(workspace.student.religiousInformation.religion)} />
                <ProfileField highlight={religiousConsideration} label="Shared spiritual schedule" value={profileValue(workspace.student.religiousInformation.shareSpiritualSchedule)} />
                <ProfileField
                  highlight={religiousConsideration}
                  label="Shared unavailable times"
                  value={workspace.student.religiousInformation.shareSpiritualSchedule && workspace.student.religiousInformation.spiritualActivities.length
                    ? workspace.student.religiousInformation.spiritualActivities.map((activity) => `${activity.dayOfWeek} ${activity.startTime}–${activity.endTime}`).join(', ')
                    : 'Not shared'}
                />
                <ProfileField highlight={workspace.student.healthInformation.hasRelevantHealthConcern === true} label="Relevant health concern" value={profileValue(workspace.student.healthInformation.hasRelevantHealthConcern)} />
                <ProfileField highlight={Boolean(workspace.student.healthInformation.conditions?.length)} label="Conditions" value={workspace.student.healthInformation.conditions?.join(', ')} />
                <ProfileField highlight={Boolean(workspace.student.healthInformation.otherCondition?.trim())} label="Other condition" value={workspace.student.healthInformation.otherCondition} />
                <ProfileField highlight={Boolean(workspace.student.healthInformation.allergyDetails?.trim())} label="Allergy details" value={workspace.student.healthInformation.allergyDetails} />
                <ProfileField highlight={Boolean(workspace.student.healthInformation.conditionDescription?.trim())} label="Condition description" value={workspace.student.healthInformation.conditionDescription} />
                <ProfileField highlight={workspace.student.healthInformation.accommodationRequired === true} label="Accommodation required" value={profileValue(workspace.student.healthInformation.accommodationRequired)} />
                <ProfileField highlight={Boolean(workspace.student.healthInformation.accommodationNotes?.trim())} label="Accommodation notes" value={workspace.student.healthInformation.accommodationNotes} />
                <ProfileField label="Emergency contact" value={workspace.student.healthInformation.emergencyContactName} />
                <ProfileField label="Emergency contact number" value={workspace.student.healthInformation.emergencyContactNumber} />
                <ProfileField label="Health information last updated" value={profileDate(workspace.student.healthInformation.lastUpdated || undefined)} />
              </dl>
            </section>
          </div>
        </div>
      </section>}

      {!showEvaluationDetails && <section aria-label="Enrollment eligibility evaluation" className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Enrollment eligibility</h3>
            <p className="mt-1 text-sm text-slate-600">Record whether this student is eligible for enrollment and add supporting remarks.</p>
          </div>
          {!evaluationOpen && <button
            type="button"
            onClick={() => setEvaluationOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            {workspace.facultyEvaluation ? 'Edit evaluation' : 'Evaluate student'}
          </button>}
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        {message && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

        {!evaluationOpen && workspace.facultyEvaluation && <div className="mt-4 rounded-lg bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">Decision</p>
          <p className={`mt-1 text-sm font-bold ${workspace.facultyEvaluation.evaluationStatus === 'eligible' ? 'text-emerald-700' : workspace.facultyEvaluation.evaluationStatus === 'not_eligible' ? 'text-rose-700' : 'text-amber-700'}`}>
            {workspace.facultyEvaluation.evaluationStatus === 'eligible'
              ? 'Eligible for enrollment'
              : workspace.facultyEvaluation.evaluationStatus === 'not_eligible'
                ? 'Not eligible for enrollment'
                : 'For review'}
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-700">Remarks</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{workspace.facultyEvaluation.remarks?.trim() || 'No remarks provided.'}</p>
        </div>}

        {evaluationOpen && <div className="mt-4 space-y-4">
          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">Is this student eligible for enrollment?</legend>
            <div role="group" aria-label="Enrollment eligibility decision" className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={enrollmentEligibility === 'eligible'}
                onClick={() => setEnrollmentEligibility('eligible')}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold ${enrollmentEligibility === 'eligible' ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                Eligible
              </button>
              <button
                type="button"
                aria-pressed={enrollmentEligibility === 'not_eligible'}
                onClick={() => setEnrollmentEligibility('not_eligible')}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold ${enrollmentEligibility === 'not_eligible' ? 'border-rose-700 bg-rose-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                Not eligible
              </button>
            </div>
          </fieldset>
          <label className="block text-sm font-semibold text-slate-700">
            Remarks
            <textarea
              value={evaluationRemarks}
              onChange={(event) => setEvaluationRemarks(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Add remarks about the enrollment eligibility decision."
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <p className="text-xs text-slate-500">This evaluation records a recommendation and does not change the student's enrollment status.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => {
              setEnrollmentEligibility(
                workspace.facultyEvaluation?.evaluationStatus === 'eligible'
                  || workspace.facultyEvaluation?.evaluationStatus === 'not_eligible'
                  ? workspace.facultyEvaluation.evaluationStatus
                  : null
              );
              setEvaluationRemarks(workspace.facultyEvaluation?.remarks || '');
              setEvaluationOpen(false);
              setError('');
              setMessage('');
            }} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              Cancel
            </button>
            <button type="button" onClick={() => void saveEligibilityEvaluation()} disabled={saving || !enrollmentEligibility} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60">
              <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save evaluation'}
            </button>
          </div>
        </div>}
      </section>}

      {showEvaluationDetails && <>
      <div aria-label="Evaluation summary" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          { label: 'Attendance rate', value: percent(workspace.metrics.attendanceRate), icon: CalendarCheck2, color: 'text-brand-700' },
          { label: 'Class percentile', value: percent(workspace.metrics.classPercentile), icon: Activity, color: 'text-accent-700' },
          { label: 'Current running grade', value: percent(workspace.metrics.runningGrade), icon: BookOpenCheck, color: 'text-brand-600' },
          { label: 'Submission rate', value: percent(workspace.metrics.submissionRate), icon: ClipboardList, color: 'text-rose-700' },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-lg border border-slate-200 bg-white p-3">
              <Icon className={`h-4 w-4 ${metric.color}`} />
              <p className="mt-2 text-xs font-semibold text-slate-500">{metric.label}</p>
              <p className="mt-0.5 text-lg font-extrabold text-slate-900">{metric.value}</p>
            </div>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div role="tablist" aria-label="Student evaluation sections" className="flex overflow-x-auto border-b border-slate-200 px-2">
          {tabItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold ${activeTab === id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        {activeTab === 'gradebook' && (
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Gradebook & Assessment Breakdown</h3>
                <p className="mt-1 text-xs text-slate-500">Quiz, lab, exam, and other assessment scores for {draft.academicYear} · {draft.semester}.</p>
              </div>
              <button type="button" onClick={addAssessment} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /> Add assessment</button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2">Assessment</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Out of</th><th className="px-3 py-2">Submitted</th><th className="px-3 py-2">Remove</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {draft.assessments.map((assessment, index) => (
                    <tr key={assessment._id || `assessment-${index}`}>
                      <td className="px-3 py-2"><input aria-label="Assessment title" value={assessment.title} onChange={(event) => updateAssessment(index, 'title', event.target.value)} className="w-full min-w-32 rounded-md border border-slate-200 px-2 py-1.5" /></td>
                      <td className="px-3 py-2"><select aria-label="Assessment category" value={assessment.category} onChange={(event) => updateAssessment(index, 'category', event.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5"><option value="quiz">Quiz</option><option value="lab">Lab</option><option value="exam">Exam</option><option value="other">Other</option></select></td>
                      <td className="px-3 py-2"><input aria-label="Assessment score" type="number" min="0" max={assessment.possiblePoints} step="0.1" value={assessment.score} onChange={(event) => updateAssessment(index, 'score', Number(event.target.value))} className="w-20 rounded-md border border-slate-200 px-2 py-1.5" /></td>
                      <td className="px-3 py-2"><input aria-label="Assessment possible points" type="number" min="1" step="0.1" value={assessment.possiblePoints} onChange={(event) => updateAssessment(index, 'possiblePoints', Number(event.target.value))} className="w-20 rounded-md border border-slate-200 px-2 py-1.5" /></td>
                      <td className="px-3 py-2"><input aria-label="Assessment submitted" type="checkbox" checked={assessment.submitted} onChange={(event) => updateAssessment(index, 'submitted', event.target.checked)} className="h-4 w-4 accent-brand-600" /></td>
                      <td className="px-3 py-2"><button type="button" aria-label="Remove assessment" onClick={() => setDraft((current) => current ? { ...current, assessments: current.assessments.filter((_, itemIndex) => itemIndex !== index) } : current)} className="rounded p-1 text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                  {draft.assessments.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No assessments recorded. Add one to begin the gradebook.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end"><button type="button" onClick={() => void saveProgress('Gradebook saved.')} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save gradebook'}</button></div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="text-sm font-bold text-slate-900">Attendance & Participation Log</h3><p className="mt-1 text-xs text-slate-500">Date-by-date attendance, participation notes, and excuse-letter references.</p></div>
              <button type="button" onClick={addAttendance} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /> Add entry</button>
            </div>
            <div className="mt-4 space-y-3">
              {draft.attendanceLogs.map((entry, index) => (
                <div key={entry._id || `attendance-${index}`} className="grid gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-2 xl:grid-cols-[140px_130px_minmax(0,1fr)_minmax(0,1fr)_36px]">
                  <label className="text-xs font-semibold text-slate-500">Date<input type="date" value={String(entry.date).slice(0, 10)} onChange={(event) => setDraft((current) => current ? { ...current, attendanceLogs: current.attendanceLogs.map((item, itemIndex) => itemIndex === index ? { ...item, date: event.target.value } : item) } : current)} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-800" /></label>
                  <label className="text-xs font-semibold text-slate-500">Status<select value={entry.status} onChange={(event) => setDraft((current) => current ? { ...current, attendanceLogs: current.attendanceLogs.map((item, itemIndex) => itemIndex === index ? { ...item, status: event.target.value as typeof item.status } : item) } : current)} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800"><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option><option value="excused">Excused</option></select></label>
                  <label className="text-xs font-semibold text-slate-500">Participation notes<input value={entry.notes || ''} onChange={(event) => setDraft((current) => current ? { ...current, attendanceLogs: current.attendanceLogs.map((item, itemIndex) => itemIndex === index ? { ...item, notes: event.target.value } : item) } : current)} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-800" /></label>
                  <label className="text-xs font-semibold text-slate-500">Excuse letter reference<input value={entry.excuseLetter || ''} onChange={(event) => setDraft((current) => current ? { ...current, attendanceLogs: current.attendanceLogs.map((item, itemIndex) => itemIndex === index ? { ...item, excuseLetter: event.target.value } : item) } : current)} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-800" /></label>
                  <button type="button" aria-label="Remove attendance entry" onClick={() => setDraft((current) => current ? { ...current, attendanceLogs: current.attendanceLogs.filter((_, itemIndex) => itemIndex !== index) } : current)} className="self-end rounded p-2 text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              {draft.attendanceLogs.length === 0 && <p className="rounded-md bg-slate-50 p-5 text-center text-xs text-slate-500">No attendance entries recorded.</p>}
            </div>
            <div className="mt-4 flex justify-end"><button type="button" onClick={() => void saveProgress('Attendance log saved.')} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save attendance'}</button></div>
          </div>
        )}

        {activeTab === 'remarks' && (
          <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-2">
            <section>
              <div className="flex items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-slate-900">Competency rubrics</h3><p className="mt-1 text-xs text-slate-500">Record a rating and supporting notes.</p></div><button type="button" onClick={addRubric} aria-label="Add rubric criterion" className="rounded-md border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" /></button></div>
              <div className="mt-3 space-y-3">
                {draft.rubricScores.map((rubric, index) => (
                  <div key={rubric._id || `rubric-${index}`} className="space-y-2 rounded-md border border-slate-200 p-3">
                    <input aria-label="Competency" value={rubric.competency} onChange={(event) => setDraft((current) => current ? { ...current, rubricScores: current.rubricScores.map((item, itemIndex) => itemIndex === index ? { ...item, competency: event.target.value } : item) } : current)} placeholder="Competency" className="w-full rounded-md border border-slate-200 px-2.5 py-2 text-xs" />
                    <div className="flex items-center gap-3"><label className="text-xs text-slate-600">Rating<select value={rubric.rating} onChange={(event) => setDraft((current) => current ? { ...current, rubricScores: current.rubricScores.map((item, itemIndex) => itemIndex === index ? { ...item, rating: Number(event.target.value) } : item) } : current)} className="ml-2 rounded-md border border-slate-200 bg-white px-2 py-1.5"><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option></select> / 5</label><button type="button" aria-label="Remove rubric criterion" onClick={() => setDraft((current) => current ? { ...current, rubricScores: current.rubricScores.filter((_, itemIndex) => itemIndex !== index) } : current)} className="ml-auto rounded p-1 text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></div>
                    <textarea aria-label="Rubric notes" value={rubric.notes || ''} onChange={(event) => setDraft((current) => current ? { ...current, rubricScores: current.rubricScores.map((item, itemIndex) => itemIndex === index ? { ...item, notes: event.target.value } : item) } : current)} placeholder="Evidence and feedback" className="min-h-16 w-full rounded-md border border-slate-200 px-2.5 py-2 text-xs" />
                  </div>
                ))}
                {draft.rubricScores.length === 0 && <p className="rounded-md bg-slate-50 p-4 text-xs text-slate-500">No rubric ratings recorded.</p>}
              </div>
            </section>
            <section>
              <div className="flex items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-slate-900">Faculty remarks</h3><p className="mt-1 text-xs text-slate-500">Qualitative feedback and internal faculty notes.</p></div><button type="button" onClick={addRemark} aria-label="Add faculty remark" className="rounded-md border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" /></button></div>
              <div className="mt-3 space-y-2">
                {draft.facultyRemarks.map((remark, index) => (
                  <div key={remark._id || `remark-${index}`} className="flex gap-2">
                    <textarea aria-label="Faculty remark" value={remark.text} onChange={(event) => setDraft((current) => current ? { ...current, facultyRemarks: current.facultyRemarks.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item) } : current)} placeholder="Write a remark" className="min-h-16 flex-1 rounded-md border border-slate-200 px-2.5 py-2 text-xs" />
                    <button type="button" aria-label="Remove faculty remark" onClick={() => setDraft((current) => current ? { ...current, facultyRemarks: current.facultyRemarks.filter((_, itemIndex) => itemIndex !== index) } : current)} className="self-start rounded p-1 text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                {draft.facultyRemarks.length === 0 && <p className="rounded-md bg-slate-50 p-4 text-xs text-slate-500">No faculty remarks recorded.</p>}
              </div>
              <label className="mt-4 block text-xs font-semibold text-slate-700">Internal notes<textarea value={draft.internalNotes} onChange={(event) => setDraft((current) => current ? { ...current, internalNotes: event.target.value } : current)} placeholder="Private faculty notes" className="mt-1 min-h-24 w-full rounded-md border border-slate-200 px-2.5 py-2 text-xs font-normal" /></label>
            </section>
            <div className="flex justify-end lg:col-span-2"><button type="button" onClick={() => void saveProgress('Remarks and rubrics saved.')} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save remarks & rubrics'}</button></div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-5 p-4 sm:p-5">
            <section className="rounded-md border border-slate-200 p-3">
              <h3 className="text-sm font-bold text-slate-800">Student status history</h3>
              {workspace.statusHistory.length === 0
                ? <p className="mt-2 text-xs text-slate-500">No status changes have been recorded.</p>
                : <ol className="mt-2 divide-y divide-slate-100">{workspace.statusHistory.map((entry, index) => (
                  <li key={`${entry.status}-${entry.effectiveDate}-${index}`} className="py-2 text-xs">
                    <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold text-slate-800">{formatStatusLabel(entry.status)}</span><time className="text-slate-500">{new Date(entry.effectiveDate).toLocaleDateString()}</time></div>
                    {entry.reason && <p className="mt-1 text-slate-600">Reason: {entry.reason}</p>}
                    {entry.remarks && <p className="mt-1 text-slate-600">{entry.remarks}</p>}
                  </li>
                ))}</ol>}
            </section>
            <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><FileClock className="h-4 w-4 shrink-0" /><p>Prerequisite checks are inferred from recorded subject results; no curriculum-specific prerequisite map is configured.</p></div>
            <div className="flex flex-col gap-3 rounded-md border border-slate-200 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-semibold text-slate-600">Latest-period GWA{latestPeriod ? ` · ${latestPeriod.academicYear} · ${latestPeriod.semester}` : ''}<small className="mt-1 block font-normal text-slate-500">Historical cumulative: Overall {formatAcademicGwa(historicalOverall)} · Major {formatAcademicGwa(workspace.majorSubjectGwa)}</small></span>
              <span className="flex gap-5"><span><small className="block text-[10px] text-slate-500">Overall</small><strong className="text-lg font-extrabold text-slate-900">{formatAcademicGwa(latestPeriod?.overallGwa)}</strong></span><span><small className="block text-[10px] text-slate-500">Major</small><strong className="text-lg font-extrabold text-slate-900">{formatAcademicGwa(latestPeriod?.majorSubjectGwa)}</strong></span></span>
            </div>
            {workspace.academicRecords.length === 0 && <p className="rounded-md bg-slate-50 p-5 text-center text-xs text-slate-500">No past semester records are available.</p>}
            {workspace.academicRecords.map((term) => (
              <section key={`${term.academicYear}-${term.semester}`} className="overflow-hidden rounded-md border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2"><h3 className="text-xs font-bold text-slate-800">{term.academicYear} · {term.semester}</h3><span className="text-[10px] font-semibold text-slate-500">Overall {formatAcademicGwa(resolvePeriodGwas(term).overallGwa)} · Major {formatAcademicGwa(resolvePeriodGwas(term).majorSubjectGwa)}</span></div>
                <div className="overflow-x-auto"><table className="w-full min-w-[550px] text-left text-xs"><thead className="border-y border-slate-200 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Units</th><th className="px-3 py-2">Grade</th><th className="px-3 py-2">Prerequisite check</th></tr></thead><tbody className="divide-y divide-slate-100">{term.subjects.map((subject) => {
                  const passed = subject.grade > 0 && subject.grade <= 3 && subject.status.toLowerCase() !== 'dropped';
                  return <tr key={subject.subjectCode}><td className="px-3 py-2"><span className="font-mono font-semibold">{subject.subjectCode}</span><span className="ml-2 text-slate-700">{subject.subjectName}</span></td><td className="px-3 py-2">{subject.isMajor ? 'Major' : 'Non-major'}</td><td className="px-3 py-2">{subject.units}</td><td className="px-3 py-2 font-semibold">{subject.grade.toFixed(2)}</td><td className="px-3 py-2"><span className={`rounded px-2 py-1 text-[10px] font-bold ${passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{passed ? 'Met' : 'Outstanding'}</span></td></tr>;
                })}</tbody></table></div>
              </section>
            ))}
            <section aria-labelledby="academic-summary-heading" className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 id="academic-summary-heading" className="text-sm font-bold text-slate-900">Summary</h3>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><dt className="text-[11px] text-slate-500">Total units</dt><dd className="mt-1 text-lg font-extrabold text-slate-900">{totalUnits}</dd></div>
              <div><dt className="text-[11px] text-slate-500">Total subjects</dt><dd className="mt-1 text-lg font-extrabold text-slate-900">{academicSubjects.length}</dd></div>
              <div><dt className="text-[11px] text-slate-500">Completed subjects</dt><dd className="mt-1 text-lg font-extrabold text-slate-900">{completedSubjects}</dd></div>
              <div><dt className="text-[11px] text-slate-500">Academic status</dt><dd className="mt-1 text-sm font-bold text-emerald-700">{studentStatus}</dd></div>
            </dl>
            </section>
            <div className="rounded-md border border-slate-200 p-3"><h3 className="text-xs font-bold text-slate-800">Current semester assessments</h3><div className="mt-2 flex flex-wrap gap-2">{draft.assessments.map((assessment, index) => <span key={assessment._id || index} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] text-slate-700">{assessment.title || 'Untitled'} · {assessment.category}</span>)}{draft.assessments.length === 0 && <span className="text-xs text-slate-500">No current assessments recorded.</span>}</div></div>
            <div className="flex justify-end border-t border-slate-200 pt-4">
              <button type="button" onClick={downloadAcademicRecords} className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">
                <Download className="h-4 w-4" aria-hidden="true" />
                Download records
              </button>
            </div>
          </div>
        )}
      </section>

      {error && <p role="alert" className="text-right text-xs font-semibold text-rose-700">{error}</p>}
      {message && <p role="status" className="text-right text-xs font-semibold text-emerald-700">{message}</p>}
      </>}
    </section>
  );
};
