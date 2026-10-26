import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, CheckCircle, Search, ShieldAlert, TriangleAlert } from 'lucide-react';
import {
  fetchStudentReport,
  fetchStudentSuggestions,
  saveStudentEvaluation,
  StudentReport,
  StudentSuggestion,
  updateStudentStatus,
} from '../../lib/api';
import { formatAcademicGwa, resolveAcademicGwas, resolvePeriodGwas } from '../../utils/mongoAcademicGwa';
import { formatStatusLabel } from '../../utils/formatStatusLabel';
import { StudentProfilePhoto } from '../common/StudentProfilePhoto';

interface BackendStudentSearchProps {
  displayMode?: 'consolidated' | 'records';
  initialQuery?: string;
}

const dateLabel = (value?: string) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleDateString();
};

const profileValue = (value: string | number | boolean | undefined) => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  return value?.trim() || 'Not provided';
};

const formatAddress = (address?: Record<string, string>) => {
  if (!address) return 'Not provided';
  const value = [
    address.street,
    address.barangay,
    address.municipality,
    address.province,
    address.region,
    address.zipCode,
    address.country,
  ].filter(Boolean).join(', ');
  return value || 'Not provided';
};

export const BackendStudentSearch: React.FC<BackendStudentSearchProps> = ({ displayMode = 'consolidated', initialQuery = '' }) => {
  const [institutionId, setInstitutionId] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [evaluationStatus, setEvaluationStatus] = useState('for_review');
  const [reasons, setReasons] = useState('');
  const [remarks, setRemarks] = useState('');
  const [studentStatus, setStudentStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const refreshing = useRef(false);

  useEffect(() => {
    const query = institutionId.trim();
    if (!query || report || initialQuery.trim()) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setSuggestionsLoading(false);
      setSuggestionsError('');
      return;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      setSuggestionsError('');
      try {
        const matches = await fetchStudentSuggestions(query);
        if (!active) return;
        setSuggestions(matches);
        setSuggestionsOpen(true);
        setActiveSuggestionIndex(-1);
      } catch (requestError) {
        if (!active) return;
        setSuggestions([]);
        setSuggestionsError(requestError instanceof Error ? requestError.message : 'Unable to load suggestions.');
      } finally {
        if (active) setSuggestionsLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [institutionId, report]);

  const findStudent = async (query: string, selectedSuggestion?: StudentSuggestion) => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const normalizedQuery = query.trim();
      if (!normalizedQuery) {
        setReport(null);
        setError('Enter a student number or name.');
        return;
      }

      let match = selectedSuggestion;
      if (!match) {
        try {
          const exactReport = await fetchStudentReport(normalizedQuery);
          setInstitutionId(exactReport.student.institutionId);
          setSuggestions([]);
          setSuggestionsOpen(false);
          setReport(exactReport);
          setEvaluationStatus(exactReport.facultyEvaluation?.evaluationStatus || 'for_review');
          setReasons(exactReport.facultyEvaluation?.reasons?.join(', ') || '');
          setRemarks(exactReport.facultyEvaluation?.remarks || '');
          setStudentStatus(exactReport.student.academicStatus?.currentStatus || '');
          return;
        } catch (reportError) {
          if (!(reportError instanceof Error) || reportError.message !== 'Student not found') throw reportError;
        }

        const matches = await fetchStudentSuggestions(normalizedQuery);
        const normalizedQueryLower = normalizedQuery.toLowerCase();
        const idMatch = matches.find((student) => student.institutionId.toLowerCase() === normalizedQueryLower);
        const usernameMatch = matches.find((student) => student.username.toLowerCase() === normalizedQueryLower);
        const fullNameMatches = matches.filter((student) => `${student.firstName} ${student.lastName}`.trim().toLowerCase() === normalizedQueryLower);
        match = idMatch || usernameMatch || (fullNameMatches.length === 1 ? fullNameMatches[0] : undefined);
        if (!match && matches.length === 1) match = matches[0];
        if (!match && matches.length) {
          throw new Error('Choose a student from the suggestions.');
        }
        if (!match) {
          try {
            const result = await fetchStudentReport(normalizedQuery);
            setInstitutionId(result.student.institutionId);
            setSuggestions([]);
            setSuggestionsOpen(false);
            setReport(result);
            setEvaluationStatus(result.facultyEvaluation?.evaluationStatus || 'for_review');
            setReasons(result.facultyEvaluation?.reasons?.join(', ') || '');
            setRemarks(result.facultyEvaluation?.remarks || '');
            setStudentStatus(result.student.academicStatus?.currentStatus || '');
            return;
          } catch (reportError) {
            const reportMessage = reportError instanceof Error ? reportError.message : '';
            throw new Error(reportMessage && reportMessage !== 'Student not found'
              ? reportMessage
              : 'No matching student was found.');
          }
        }
      }

      const result = await fetchStudentReport(match.institutionId);
      setInstitutionId(match.institutionId);
      setSuggestions([]);
      setSuggestionsOpen(false);
      setReport(result);
      setEvaluationStatus(result.facultyEvaluation?.evaluationStatus || 'for_review');
      setReasons(result.facultyEvaluation?.reasons?.join(', ') || '');
      setRemarks(result.facultyEvaluation?.remarks || '');
      setStudentStatus(result.student.academicStatus?.currentStatus || '');
    } catch (requestError) {
      setReport(null);
      setError(requestError instanceof Error ? requestError.message : 'Unable to find student.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery.trim()) void findStudent(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!report) return;

    let active = true;
    const refreshReport = async () => {
      if (document.visibilityState !== 'visible' || loading || refreshing.current) return;
      refreshing.current = true;
      try {
        const updatedReport = await fetchStudentReport(report.student.institutionId);
        if (!active) return;

        const previousEvaluation = report.facultyEvaluation;
        if (evaluationStatus === (previousEvaluation?.evaluationStatus || 'for_review')) {
          setEvaluationStatus(updatedReport.facultyEvaluation?.evaluationStatus || 'for_review');
        }
        if (reasons === (previousEvaluation?.reasons?.join(', ') || '')) {
          setReasons(updatedReport.facultyEvaluation?.reasons?.join(', ') || '');
        }
        if (remarks === (previousEvaluation?.remarks || '')) {
          setRemarks(updatedReport.facultyEvaluation?.remarks || '');
        }
        if (studentStatus === (report.student.academicStatus?.currentStatus || '')) {
          setStudentStatus(updatedReport.student.academicStatus?.currentStatus || '');
        }
        setReport(updatedReport);
        setError('');
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to refresh this student report.');
      } finally {
        refreshing.current = false;
      }
    };

    window.addEventListener('focus', refreshReport);
    document.addEventListener('visibilitychange', refreshReport);
    return () => {
      active = false;
      window.removeEventListener('focus', refreshReport);
      document.removeEventListener('visibilitychange', refreshReport);
    };
  }, [evaluationStatus, loading, reasons, remarks, report, studentStatus]);

  const searchStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    await findStudent(institutionId);
  };

  const saveEvaluation = async () => {
    if (!report) return;
    setLoading(true);
    setError('');
    try {
      await saveStudentEvaluation(report.student.institutionId, {
        evaluationStatus,
        reasons: reasons.split(',').map((reason) => reason.trim()).filter(Boolean),
        remarks,
      });
      setMessage('Faculty evaluation saved.');
      setReport(await fetchStudentReport(report.student.institutionId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save evaluation.');
    } finally {
      setLoading(false);
    }
  };

  const saveStatus = async () => {
    if (!report || !studentStatus.trim()) return;
    setLoading(true);
    setError('');
    try {
      await updateStudentStatus(report.student.institutionId, {
        status: studentStatus.trim(),
        reason: statusReason.trim() || undefined,
        remarks: 'Updated from faculty dashboard.',
      });
      setMessage('Student status updated.');
      setReport(await fetchStudentReport(report.student.institutionId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update status.');
    } finally {
      setLoading(false);
    }
  };

  const studentName = report?.student.personalInformation
    ? `${report.student.personalInformation.firstName || ''} ${report.student.personalInformation.lastName || ''}`.trim()
    : report?.student.institutionId;
  const latestRecord = report?.academicRecords[0];
  const latestFallbackGwas = resolvePeriodGwas(latestRecord);
  const reportedLatestPeriod = report?.latestAcademicPeriod;
  const latestAcademicPeriod = reportedLatestPeriod || latestRecord ? {
    academicYear: reportedLatestPeriod?.academicYear || latestRecord?.academicYear || '',
    semester: reportedLatestPeriod?.semester || latestRecord?.semester || '',
    overallGwa: reportedLatestPeriod?.overallGwa ?? latestFallbackGwas.overallGwa ?? undefined,
    majorSubjectGwa: reportedLatestPeriod?.majorSubjectGwa ?? latestFallbackGwas.majorSubjectGwa ?? 0,
  } : null;
  const historicalFallbackGwas = resolveAcademicGwas(report?.academicRecords || []);
  const historicalOverallGwa = report?.overallGwa ?? historicalFallbackGwas.overallGwa;
  const academicStatus = report?.student.academicStatus;
  const isOnProbation = academicStatus?.isOnProbation === true
    || /probation/i.test(academicStatus?.currentStatus || '');
  const healthInformation = report?.student.healthInformation;
  const student = report?.student;
  const spiritualSchedule = student?.religiousInformation?.shareSpiritualSchedule
    ? student.religiousInformation.spiritualActivities?.map((activity) =>
      `${activity.dayOfWeek} ${activity.startTime}–${activity.endTime}`
    ).join(', ')
    : 'Not shared';
  const profileSections = student ? [
    {
      title: 'Personal information',
      fields: [
        ['First name', profileValue(student.personalInformation?.firstName)],
        ['Middle name', profileValue(student.personalInformation?.middleName)],
        ['Last name', profileValue(student.personalInformation?.lastName)],
        ['Suffix', profileValue(student.personalInformation?.suffix)],
        ['Date of birth', dateLabel(student.personalInformation?.birthDate)],
        ['Place of birth', profileValue(student.personalInformation?.birthPlace)],
        ['Sex', profileValue(student.personalInformation?.sex)],
        ['Civil status', profileValue(student.personalInformation?.civilStatus)],
        ['Height', profileValue(student.personalInformation?.height)],
        ['Weight', profileValue(student.personalInformation?.weight)],
        ['Blood type', profileValue(student.personalInformation?.bloodType)],
        ['Nationality', profileValue(student.personalInformation?.nationality)],
        ['Citizenship', profileValue(student.personalInformation?.citizenship)],
        ['Dual citizenship', profileValue(student.personalInformation?.dualCitizenship)],
        ['Minority group', profileValue(student.personalInformation?.minority)],
        ['Foreigner', profileValue(student.personalInformation?.isForeigner)],
      ],
    },
    {
      title: 'Student classification',
      fields: [
        ['Program', profileValue(student.classification?.program)],
        ['Student type', profileValue(student.classification?.studentType)],
        ['Indigenous Peoples', profileValue(student.classification?.isIP)],
        ['Indigenous group', profileValue(student.classification?.indigenousGroup)],
        ['Person with disability', profileValue(student.classification?.isPWD)],
        ['Shifter', profileValue(student.classification?.isShifter)],
        ['Transferee', profileValue(student.classification?.isTransferee)],
      ],
    },
    {
      title: 'Enrollment information',
      fields: [
        ['Course', profileValue(student.enrollmentInformation?.course)],
        ['Level', profileValue(student.enrollmentInformation?.level)],
        ['Department', profileValue(student.enrollmentInformation?.department)],
        ['Curriculum', profileValue(student.enrollmentInformation?.curriculum)],
        ['Year level', profileValue(student.enrollmentInformation?.yearLevel || student.yearLevel)],
        ['Section', profileValue(student.section)],
        ['Enrollment status', profileValue(student.enrollmentStatus)],
        ['Entry period', profileValue(student.enrollmentInformation?.entryPeriod)],
        ['Entry date', dateLabel(student.enrollmentInformation?.entryDate)],
        ['Student type', profileValue(student.enrollmentInformation?.studentType)],
        ['Preferred modality', profileValue(student.enrollmentInformation?.preferredModality)],
        ['Campus', profileValue(student.enrollmentInformation?.campus)],
        ['Learner reference number', profileValue(student.enrollmentInformation?.learnerReferenceNo)],
        ['NSTP number', profileValue(student.enrollmentInformation?.nstpNumber)],
      ],
    },
    {
      title: 'Contact information',
      fields: [
        ['Mobile number', profileValue(student.contactInformation?.mobileNumber)],
        ['Alternate mobile number', profileValue(student.contactInformation?.alternateMobileNumber)],
        ['Telephone number', profileValue(student.contactInformation?.telephoneNumber)],
        ['Institutional email', profileValue(student.contactInformation?.institutionalEmail)],
        ['Alternate email', profileValue(student.contactInformation?.alternateEmail)],
      ],
    },
    {
      title: 'Addresses and education',
      fields: [
        ['Present address', formatAddress(student.addresses?.presentAddress)],
        ['Home address', formatAddress(student.addresses?.homeAddress)],
        ['Previous school', profileValue(student.educationalBackground?.previousSchool)],
        ['Senior high school', profileValue(student.educationalBackground?.seniorHigh)],
        ['Junior high school', profileValue(student.educationalBackground?.juniorHigh)],
        ['Elementary school', profileValue(student.educationalBackground?.elementary)],
      ],
    },
    {
      title: 'Religious and health information',
      fields: [
        ['Religion', profileValue(student.religiousInformation?.religion)],
        ['Spiritual schedule shared', profileValue(student.religiousInformation?.shareSpiritualSchedule)],
        ['Shared spiritual activities', spiritualSchedule],
        ['Relevant health concern', profileValue(healthInformation?.hasRelevantHealthConcern)],
        ['Conditions', healthInformation?.conditions?.join(', ') || 'Not provided'],
        ['Other condition', profileValue(healthInformation?.otherCondition)],
        ['Allergy details', profileValue(healthInformation?.allergyDetails)],
        ['Condition description', profileValue(healthInformation?.conditionDescription)],
        ['Accommodation required', profileValue(healthInformation?.accommodationRequired)],
        ['Accommodation notes', profileValue(healthInformation?.accommodationNotes)],
        ['Emergency contact', profileValue(healthInformation?.emergencyContactName)],
        ['Emergency contact number', profileValue(healthInformation?.emergencyContactNumber)],
        ['Health information last updated', dateLabel(healthInformation?.lastUpdated)],
      ],
    },
  ] : [];

  return (
    <section className="space-y-5">
      <div className="grid gap-5 border-b border-slate-200 pb-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(420px,1.2fr)] lg:items-end">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-700">Faculty workspace</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">{displayMode === 'records' ? 'Academic Records' : 'Student Search'}</h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">{displayMode === 'records' ? 'Search for a student to view their report card grades.' : 'Find a student by student number, name, or username.'}</p>
        </div>
        <form onSubmit={searchStudent} className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <input
            value={institutionId}
            onChange={(event) => {
              setInstitutionId(event.target.value);
              setReport(null);
              setError('');
              setSuggestionsOpen(Boolean(event.target.value.trim()));
            }}
            onFocus={() => { if (institutionId.trim()) setSuggestionsOpen(true); }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setSuggestionsOpen(false);
              if (event.key === 'ArrowDown' && suggestions.length) {
                event.preventDefault();
                setSuggestionsOpen(true);
                setActiveSuggestionIndex((index) => Math.min(index + 1, suggestions.length - 1));
              }
              if (event.key === 'ArrowUp' && suggestions.length) {
                event.preventDefault();
                setActiveSuggestionIndex((index) => Math.max(index - 1, 0));
              }
              if (event.key === 'Enter' && suggestionsOpen && activeSuggestionIndex >= 0) {
                event.preventDefault();
                void findStudent(institutionId, suggestions[activeSuggestionIndex]);
              }
            }}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen}
            aria-controls="student-search-suggestions"
            aria-activedescendant={activeSuggestionIndex >= 0 ? `student-suggestion-${activeSuggestionIndex}` : undefined}
            aria-label="Search by student number or name"
            placeholder="Search by student number or name"
            className="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 pl-10 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            required
          />
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
          {suggestionsOpen && (
            <ul id="student-search-suggestions" role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
              {suggestionsLoading && <li className="px-3 py-2 text-xs text-slate-500">Searching students…</li>}
              {!suggestionsLoading && suggestionsError && <li role="alert" className="px-3 py-2 text-xs text-rose-600">{suggestionsError}</li>}
              {!suggestionsLoading && !suggestionsError && suggestions.length === 0 && <li className="px-3 py-2 text-xs text-slate-500">No matching students.</li>}
              {suggestions.map((student, index) => (
                <li key={student.institutionId} id={`student-suggestion-${index}`} role="option" aria-selected={activeSuggestionIndex === index}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                    onClick={() => void findStudent(institutionId, student)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left ${activeSuggestionIndex === index ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <StudentProfilePhoto
                        institutionId={student.institutionId}
                        studentName={`${student.firstName} ${student.lastName}`}
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-slate-800">{student.firstName} {student.lastName}</span>
                        <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-500">{student.institutionId}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-500">@{student.username}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="submit" disabled={loading} className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60">
          <Search className="h-4 w-4" /> {loading ? 'Loading…' : 'Search Student'}
        </button>
      </form>
      </div>

      {!report && !loading && !error && <p aria-live="polite" className="text-sm text-slate-500">Search for a student to view their records.</p>}
      {loading && <p aria-live="polite" className="text-sm text-slate-500">Loading student report…</p>}
      {error && <p role="alert" aria-live="assertive" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {message && <p role="status" aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      {report && (
        <div className="space-y-5">
          <div className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
            <div className="flex min-w-0 items-center gap-4">
              <StudentProfilePhoto
                institutionId={report.student.institutionId}
                studentName={studentName || 'Student'}
                className="h-16 w-16 shrink-0 rounded-full border border-slate-200 object-cover"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xl font-extrabold tracking-tight text-slate-950">{studentName || 'Student record'}</p>
                  <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-600">{report.student.institutionId}</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold ${isOnProbation ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {isOnProbation ? <TriangleAlert className="h-3 w-3" aria-hidden="true" /> : <CheckCircle className="h-3 w-3" aria-hidden="true" />}
                    {isOnProbation ? 'Probationary' : 'Regular'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{report.student.enrollmentInformation?.course || report.student.classification?.program || 'Program not recorded'}</p>
                {(report.student.yearLevel || report.student.enrollmentInformation?.yearLevel || report.student.enrollmentInformation?.level || report.student.section) && (
                  <p className="mt-1 text-xs text-slate-500">
                    {report.student.yearLevel || report.student.enrollmentInformation?.yearLevel || report.student.enrollmentInformation?.level ? `Year ${report.student.yearLevel || report.student.enrollmentInformation?.yearLevel || report.student.enrollmentInformation?.level}` : null}
                    {report.student.section ? ` · Section ${report.student.section}` : null}
                  </p>
                )}
              </div>
            </div>
            <div className="w-full rounded-xl bg-brand-700 px-4 py-3 text-white sm:w-auto sm:min-w-72">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-200">Latest period</p>
              <div className="mt-1 grid grid-cols-2 gap-4">
                <div><span className="text-[10px] text-brand-200">Overall</span><p className="text-xl font-black">{formatAcademicGwa(latestAcademicPeriod?.overallGwa)}</p></div>
                <div><span className="text-[10px] text-brand-200">Major</span><p className="text-xl font-black">{formatAcademicGwa(latestAcademicPeriod?.majorSubjectGwa)}</p></div>
              </div>
              <p className="mt-1 text-[10px] text-brand-100">{latestAcademicPeriod ? `${latestAcademicPeriod.academicYear} · ${latestAcademicPeriod.semester}` : 'Not recorded'}</p>
              <p className="mt-2 border-t border-white/15 pt-2 text-[10px] text-brand-200">Cumulative · Overall {formatAcademicGwa(historicalOverallGwa)} · Major {formatAcademicGwa(report.majorSubjectGwa)}</p>
            </div>
          </div>

          {displayMode === 'consolidated' && <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-xs font-medium text-slate-500">Current status</span><strong className="mt-2 block text-slate-900">{formatStatusLabel(report.student.academicStatus?.currentStatus)}</strong></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-xs font-medium text-slate-500">Academic records</span><strong className="mt-2 block text-slate-900">{report.academicRecords.length}</strong></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-xs font-medium text-slate-500">Latest evaluation</span><strong className="mt-2 block text-slate-900">{formatStatusLabel(report.facultyEvaluation?.evaluationStatus || 'For review')}</strong></div>
          </div>}

          {displayMode === 'consolidated' && <section aria-labelledby="probation-status-heading" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="probation-status-heading" className="text-sm font-bold text-slate-900">Academic probation</h3>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${isOnProbation ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {isOnProbation ? <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" /> : <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                {isOnProbation ? 'Under academic probation' : 'Not under academic probation'}
              </span>
            </div>
            {isOnProbation ? (
              <dl className="mt-3 grid gap-3 text-xs text-slate-700 sm:grid-cols-3">
                <div><dt className="font-semibold text-rose-900">Reason</dt><dd className="mt-1">{academicStatus?.probationReason || 'Not recorded'}</dd></div>
                <div><dt className="font-semibold text-rose-900">Remarks</dt><dd className="mt-1">{academicStatus?.statusRemarks || 'Not recorded'}</dd></div>
                <div><dt className="font-semibold text-rose-900">Effective date</dt><dd className="mt-1">{dateLabel(academicStatus?.effectiveDate)}</dd></div>
              </dl>
            ) : (
              <p className="mt-2 text-xs text-slate-500">This student is currently in good standing &mdash; no probationary status is recorded.</p>
            )}
          </section>}

          {displayMode === 'consolidated' && <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">Student profiling information</h3>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">Confidential student information</span>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {profileSections.map((section) => (
                <section key={section.title} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                  <h4 className="text-xs font-bold text-slate-800">{section.title}</h4>
                  <dl className="mt-3 grid gap-x-4 gap-y-3 text-xs sm:grid-cols-2">
                    {section.fields.map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <dt className="font-medium text-slate-500">{label}</dt>
                        <dd className="mt-0.5 break-words text-slate-800">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          </div>}

          {displayMode === 'consolidated' && <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><BookOpen className="h-4 w-4 text-brand-600" /> Faculty evaluation</h3>
              <select value={evaluationStatus} onChange={(event) => setEvaluationStatus(event.target.value)} className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="eligible">Eligible</option>
                <option value="not_eligible">Not Eligible</option>
                <option value="for_review">For review</option>
              </select>
              <input value={reasons} onChange={(event) => setReasons(event.target.value)} placeholder="Reasons, separated by commas" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Evaluation remarks" className="mt-2 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <button onClick={saveEvaluation} disabled={loading} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"><CheckCircle2 className="h-4 w-4" /> Save evaluation</button>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><ShieldAlert className="h-4 w-4 text-amber-600" /> Current status</h3>
              <input value={studentStatus ? formatStatusLabel(studentStatus) : ''} onChange={(event) => setStudentStatus(event.target.value)} placeholder="e.g. Regular, On Probation" className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={statusReason} onChange={(event) => setStatusReason(event.target.value)} placeholder="Reason for status update" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <button onClick={saveStatus} disabled={loading || !studentStatus.trim()} className="mt-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">Update student status</button>
              <p className="mt-3 text-xs text-slate-500">Status history entries are refreshed after a successful update.</p>
            </div>
          </div>}

          {displayMode === 'consolidated' && report.student.schedulingRestrictions && report.student.schedulingRestrictions.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Scheduling restrictions</strong><p className="mt-1 text-xs">Do not enroll the student in meeting times that overlap: {report.student.schedulingRestrictions.map((slot) => `${slot.dayOfWeek} ${slot.startTime}–${slot.endTime}`).join('; ')}.</p></div>}

          <div className="space-y-3">
            {displayMode === 'consolidated' && <h3 className="text-sm font-bold text-slate-900">Academic records</h3>}
            {report.academicRecords.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No academic records have been entered.</p>
            )}
            {report.academicRecords.map((term) => (
              <div key={`${term.academicYear}-${term.semester}`} className="overflow-hidden rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700"><span>{term.academicYear} · {term.semester}</span><span className="font-medium text-slate-500">Overall {formatAcademicGwa(resolvePeriodGwas(term).overallGwa)} · Major {formatAcademicGwa(resolvePeriodGwas(term).majorSubjectGwa)}</span></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-y border-slate-200 text-slate-500"><tr><th className="px-3 py-2">Code</th><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Units</th><th className="px-3 py-2">Grade</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {term.subjects.map((subject) => (
                        <tr key={subject.subjectCode}>
                          <td className="px-3 py-2 font-mono font-semibold">{subject.subjectCode}</td>
                          <td className="px-3 py-2">{subject.subjectName}</td>
                          <td className="px-3 py-2">{subject.units}</td>
                          <td className="px-3 py-2 font-semibold">{subject.grade || '—'}</td>
                          <td className="px-3 py-2">{subject.isMajor ? 'Major' : 'Non-major'}</td>
                          <td className="px-3 py-2">{formatStatusLabel(subject.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {displayMode === 'consolidated' && <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Status history</h3>
            {report.statusHistory.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No status history recorded.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <tr><th className="px-3 py-2">Effective date</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Reason</th><th className="px-3 py-2">Remarks</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.statusHistory.map((entry, index) => (
                      <tr key={`${entry.effectiveDate}-${index}`}>
                        <td className="px-3 py-2">{dateLabel(entry.effectiveDate)}</td>
                        <td className="px-3 py-2">{formatStatusLabel(entry.status)}</td>
                        <td className="px-3 py-2">{entry.reason || 'Not recorded'}</td>
                        <td className="px-3 py-2">{entry.remarks || 'Not recorded'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>}
        </div>
      )}
    </section>
  );
};
