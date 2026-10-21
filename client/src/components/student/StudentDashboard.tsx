import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  PencilLine,
  UserRound,
} from 'lucide-react';
import { StudentIdentity, StudentReport } from '../../lib/api';
import { calculateStudentProfileCompletion } from '../../utils/studentProfileCompletion';

interface StudentDashboardProps {
  identity: StudentIdentity;
  report: StudentReport | null;
  reportError: string;
  onViewRecords: () => void;
  onEditProfile: () => void;
}

interface DashboardUpdate {
  id: string;
  title: string;
  detail: string;
  date: string;
  timestamp: number;
}

const displayValue = (value?: string | number | null) =>
  value === undefined || value === null || String(value).trim() === '' ? 'Not recorded' : String(value);

const formatStatus = (value?: string) => value
  ? value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  : 'Not recorded';

const formatUpdateDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getRecentUpdates = (identity: StudentIdentity, report: StudentReport | null): DashboardUpdate[] => {
  const updates: DashboardUpdate[] = [];
  const addUpdate = (id: string, title: string, detail: string, value?: string) => {
    if (!value) return;
    const date = formatUpdateDate(value);
    const timestamp = new Date(value).getTime();
    if (!date || Number.isNaN(timestamp)) return;
    updates.push({ id, title, detail, date, timestamp });
  };

  (Array.isArray(report?.statusHistory) ? report.statusHistory : []).forEach((entry, index) => {
    addUpdate(
      `standing-${index}`,
      'Academic standing updated',
      `Your standing is now ${formatStatus(entry.status)}.`,
      entry.effectiveDate,
    );
  });

  if (report?.facultyEvaluation?.evaluatedAt) {
    addUpdate(
      'evaluation',
      'Faculty evaluation updated',
      `Your evaluation is ${formatStatus(report.facultyEvaluation.evaluationStatus)}.`,
      report.facultyEvaluation.evaluatedAt,
    );
  }

  if (identity.healthInformation?.lastUpdated) {
    addUpdate(
      'health-profile',
      'Health information updated',
      'Your health profile information was updated.',
      identity.healthInformation.lastUpdated,
    );
  }

  return updates.sort((first, second) => second.timestamp - first.timestamp).slice(0, 3);
};

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  identity,
  report,
  reportError,
  onViewRecords,
  onEditProfile,
}) => {
  const firstName = identity.personalInformation?.firstName?.trim();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const student = report?.student;
  const completion = calculateStudentProfileCompletion(identity);
  const enrollmentStatus = student?.enrollmentStatus || identity.enrollmentInformation?.enrollmentStatus;
  const academicStatus = identity.academicStatus?.currentStatus;
  const course = student?.enrollmentInformation?.course ||
    identity.enrollmentInformation?.course ||
    identity.classification?.program;
  const yearLevel = student?.yearLevel ||
    student?.enrollmentInformation?.yearLevel ||
    identity.enrollmentInformation?.yearLevel ||
    identity.enrollmentInformation?.level;
  const section = student?.section || identity.enrollmentInformation?.section;
  const latestPeriod = report?.latestAcademicPeriod || report?.academicRecords?.[0];
  const recentUpdates = getRecentUpdates(identity, report);
  const isEnrolled = enrollmentStatus?.toLowerCase() === 'enrolled';
  const hasEnrollmentRisk = enrollmentStatus?.toLowerCase() === 'not_enrolled';

  return (
    <section className="student-dashboard" aria-labelledby="student-dashboard-title">
      <div className="student-dashboard-heading">
        <div>
          <h2 id="student-dashboard-title">Student Dashboard</h2>
          <p>{greeting}{firstName ? `, ${firstName}` : ''}. Here's your academic overview.</p>
        </div>
        <button type="button" className="student-dashboard-edit-link" onClick={onEditProfile}>
          <PencilLine aria-hidden="true" />
          <span>Edit profile</span>
        </button>
      </div>

      {reportError && (
        <p role="alert" className="student-notice student-notice-error student-dashboard-error">
          {reportError} Some dashboard details may be unavailable.
        </p>
      )}

      <div className="student-dashboard-summary">
        <article className="student-dashboard-card student-dashboard-status-card">
          <div className="student-dashboard-card-label">Enrollment status</div>
          <span className={`student-dashboard-badge${isEnrolled ? ' student-dashboard-badge-success' : hasEnrollmentRisk ? ' student-dashboard-badge-warning' : ''}`}>
            {isEnrolled && <CheckCircle2 aria-hidden="true" />}
            {formatStatus(enrollmentStatus)}
          </span>
          <p className="student-dashboard-card-detail">
            {displayValue(latestPeriod?.academicYear)}{latestPeriod?.semester ? ` · ${latestPeriod.semester}` : ''}
          </p>
          <button type="button" className="student-dashboard-card-link" onClick={onViewRecords}>
            View academic records <ArrowRight aria-hidden="true" />
          </button>
        </article>

        <article className="student-dashboard-card student-dashboard-standing-card">
          <div className="student-dashboard-card-label">Academic standing</div>
          <span className={`student-dashboard-badge${identity.academicStatus?.isOnProbation ? ' student-dashboard-badge-warning' : academicStatus?.toLowerCase() === 'regular' ? ' student-dashboard-badge-success' : ''}`}>
            {formatStatus(academicStatus)}
          </span>
          <p className="student-dashboard-card-detail">
            {identity.academicStatus?.isOnProbation ? 'Contact your adviser for support.' : 'Current recorded standing'}
          </p>
          <button type="button" className="student-dashboard-card-link" onClick={onViewRecords}>
            View details <ArrowRight aria-hidden="true" />
          </button>
        </article>

        <article className="student-dashboard-card student-dashboard-course-card">
          <div className="student-dashboard-card-label">Course / year level / section</div>
          <p className="student-dashboard-course">{displayValue(course)}</p>
          <p className="student-dashboard-card-detail">
            {displayValue(yearLevel)}{section ? ` · Section ${section}` : ''}
          </p>
          <button type="button" className="student-dashboard-card-link" onClick={onEditProfile}>
            View profile <ArrowRight aria-hidden="true" />
          </button>
        </article>

        <article className="student-dashboard-card student-dashboard-profile-card">
          <div className="student-dashboard-card-label">Profile completion</div>
          <div
            className="student-dashboard-progress"
            role="progressbar"
            aria-label="Profile completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completion}
            style={{ background: `conic-gradient(var(--student-success) ${completion * 3.6}deg, var(--student-line) 0)` }}
          >
            <span>{completion}%</span>
          </div>
          <p className="student-dashboard-card-detail">Complete your profile for a more complete record.</p>
          <button type="button" className="student-dashboard-card-link" onClick={onEditProfile}>
            Complete profile <ArrowRight aria-hidden="true" />
          </button>
        </article>
      </div>

      <div className="student-dashboard-content">
        <section className="student-dashboard-panel" aria-labelledby="student-enrollment-heading">
          <div className="student-dashboard-panel-heading">
            <div className="student-dashboard-panel-icon">
              <GraduationCap aria-hidden="true" />
            </div>
            <div>
              <h3 id="student-enrollment-heading">My Enrollment</h3>
              <p>Your current academic information</p>
            </div>
            <span className={`student-dashboard-badge student-dashboard-badge-compact${isEnrolled ? ' student-dashboard-badge-success' : hasEnrollmentRisk ? ' student-dashboard-badge-warning' : ''}`}>
              {formatStatus(enrollmentStatus)}
            </span>
          </div>
          <dl className="student-dashboard-enrollment-list">
            <div><dt>Academic year</dt><dd>{displayValue(latestPeriod?.academicYear)}</dd></div>
            <div><dt>Semester</dt><dd>{displayValue(latestPeriod?.semester)}</dd></div>
            <div><dt>Course</dt><dd>{displayValue(course)}</dd></div>
            <div><dt>Year level</dt><dd>{displayValue(yearLevel)}</dd></div>
            <div><dt>Section</dt><dd>{displayValue(section)}</dd></div>
          </dl>
          <button type="button" className="student-dashboard-primary-button" onClick={onViewRecords}>
            <BookOpen aria-hidden="true" />
            View academic records
          </button>
        </section>

        <section className="student-dashboard-panel student-dashboard-updates-panel" aria-labelledby="student-updates-heading">
          <div className="student-dashboard-panel-heading">
            <div className="student-dashboard-panel-icon student-dashboard-panel-icon-green">
              <Clock3 aria-hidden="true" />
            </div>
            <div>
              <h3 id="student-updates-heading">Recent Updates</h3>
              <p>Changes recorded for your account</p>
            </div>
          </div>
          {recentUpdates.length > 0 ? (
            <ul className="student-dashboard-updates">
              {recentUpdates.map((update) => (
                <li key={update.id}>
                  <span className="student-dashboard-update-icon"><CheckCircle2 aria-hidden="true" /></span>
                  <div className="student-dashboard-update-copy">
                    <div className="student-dashboard-update-title">
                      <strong>{update.title}</strong>
                      <time dateTime={new Date(update.timestamp).toISOString()}>{update.date}</time>
                    </div>
                    <p>{update.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="student-dashboard-empty-updates">
              <UserRound aria-hidden="true" />
              <p>No recent updates have been recorded.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
};
