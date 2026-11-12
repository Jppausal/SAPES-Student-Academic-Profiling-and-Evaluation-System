import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  GraduationCap,
  PencilLine,
  FileText,
  UserRound,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { StudentIdentity, StudentReport } from '../../lib/api';
import { calculateStudentProfileCompletion } from '../../utils/studentProfileCompletion';
import dashboardHeader from '../../assets/branding/dashboard-header.png';

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

const buildMockClearanceSlip = (identity: StudentIdentity, report: StudentReport | null) => {
  const document = new jsPDF();
  const firstName = identity.personalInformation?.firstName || '';
  const lastName = identity.personalInformation?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Student';
  const program = report?.student?.enrollmentInformation?.course ||
    identity.enrollmentInformation?.course ||
    identity.classification?.program ||
    'Not recorded';
  const evaluationStatus = formatStatus(report?.facultyEvaluation?.evaluationStatus || 'eligible');
  const issuedDate = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  document.setFillColor(7, 52, 116);
  document.rect(0, 0, 210, 34, 'F');
  document.setTextColor(255, 255, 255);
  document.setFontSize(18);
  document.setFont('helvetica', 'bold');
  document.text('SAPES', 20, 16);
  document.setFontSize(10);
  document.setFont('helvetica', 'normal');
  document.text('Student Enrollment & Academic Status Management System', 20, 24);

  document.setTextColor(7, 52, 116);
  document.setFontSize(20);
  document.setFont('helvetica', 'bold');
  document.text('Enrollment Clearance Slip', 20, 58);
  document.setFontSize(10);
  document.setFont('helvetica', 'normal');
  document.setTextColor(71, 85, 105);
  document.text('Mock document for interface preview only', 20, 66);

  document.setDrawColor(226, 232, 240);
  document.line(20, 75, 190, 75);
  document.setFontSize(11);
  document.setTextColor(30, 41, 59);
  document.setFont('helvetica', 'bold');
  document.text('Student information', 20, 90);
  document.setFont('helvetica', 'normal');
  document.text(`Name: ${fullName}`, 20, 101);
  document.text(`Institution ID: ${identity.institutionId || 'Not recorded'}`, 20, 111);
  document.text(`Program: ${program}`, 20, 121);
  document.text(`Issued: ${issuedDate}`, 20, 131);

  document.setFillColor(236, 253, 245);
  document.roundedRect(20, 145, 170, 28, 4, 4, 'F');
  document.setTextColor(21, 128, 61);
  document.setFont('helvetica', 'bold');
  document.text('STATUS: ELIGIBLE FOR ENROLLMENT', 30, 158);
  document.setFont('helvetica', 'normal');
  document.setFontSize(9);
  document.text(`Basis: ${evaluationStatus} / current enrollment record`, 30, 166);

  document.setTextColor(100, 116, 139);
  document.setFontSize(9);
  document.text('This is a mock clearance slip and is not an official enrollment document.', 20, 205);
  document.text('Please confirm final clearance requirements with the Enrollment Office.', 20, 212);
  return document;
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
  const [clearancePreviewUrl, setClearancePreviewUrl] = useState('');
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
  const evaluationStatus = report?.facultyEvaluation?.evaluationStatus?.toLowerCase();
  const isEnrollmentEligible = isEnrolled || evaluationStatus === 'eligible';

  useEffect(() => () => {
    if (clearancePreviewUrl) URL.revokeObjectURL(clearancePreviewUrl);
  }, [clearancePreviewUrl]);

  const viewClearanceSlip = () => {
    if (!isEnrollmentEligible) return;
    const pdfBlob = buildMockClearanceSlip(identity, report).output('blob');
    const previewUrl = URL.createObjectURL(pdfBlob);
    setClearancePreviewUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return previewUrl;
    });
  };

  const downloadClearanceSlip = () => {
    if (!isEnrollmentEligible) return;
    buildMockClearanceSlip(identity, report).save(
      `sapes-enrollment-clearance-${identity.institutionId || 'student'}.pdf`
    );
  };

  return (
    <section className="student-dashboard" aria-labelledby="student-dashboard-title">
      <header
        className="student-dashboard-hero"
        style={{ backgroundImage: `url("${dashboardHeader}")` }}
      >
        <div className="student-dashboard-hero-content">
          <span className="student-dashboard-hero-accent" aria-hidden="true" />
          <h2 id="student-dashboard-title">
            {greeting}{firstName ? `, ${firstName}` : ''}!
          </h2>
          <p className="student-dashboard-hero-description">
            Here’s an overview of your academic profile and progress.
          </p>
          <div className="student-dashboard-hero-meta">
            <GraduationCap aria-hidden="true" />
            <span className="student-dashboard-program">{displayValue(course)}</span>
            <span className="student-dashboard-hero-meta-divider" aria-hidden="true" />
            <span className="student-dashboard-institution-id">
              <span>Institution ID</span>
              {identity.institutionId || 'TEST-BSIT-0001'}
            </span>
          </div>
        </div>
        <button type="button" className="student-dashboard-edit-link" onClick={onEditProfile}>
          <PencilLine aria-hidden="true" />
          <span>Edit profile</span>
        </button>
      </header>

      {reportError && (
        <p role="alert" className="student-notice student-notice-error student-dashboard-error">
          {reportError} Some dashboard details may be unavailable.
        </p>
      )}

      <div className="student-dashboard-summary">
        <article className="student-dashboard-card student-dashboard-status-card">
          <div className="student-dashboard-card-topline">
            <span className="student-dashboard-card-icon"><CalendarDays aria-hidden="true" /></span>
            <div className="student-dashboard-card-label">Enrollment status</div>
            <span className={`student-dashboard-badge${isEnrolled ? ' student-dashboard-badge-success' : hasEnrollmentRisk ? ' student-dashboard-badge-warning' : ''}`}>
              {isEnrolled && <CheckCircle2 aria-hidden="true" />}
              {isEnrolled ? 'Active' : formatStatus(enrollmentStatus)}
            </span>
          </div>
          <strong className="student-dashboard-card-value">{formatStatus(enrollmentStatus)}</strong>
          <span className="student-dashboard-card-watermark"><FileText aria-hidden="true" /></span>
          <p className="student-dashboard-card-detail">
            {displayValue(latestPeriod?.academicYear)}{latestPeriod?.semester ? ` · ${latestPeriod.semester}` : ''}
          </p>
          <button type="button" className="student-dashboard-card-link" onClick={onViewRecords}>
            View academic records <ArrowRight aria-hidden="true" />
          </button>
        </article>

        <article className="student-dashboard-card student-dashboard-standing-card">
          <div className="student-dashboard-card-topline">
            <span className="student-dashboard-card-icon"><BarChart3 aria-hidden="true" /></span>
            <div className="student-dashboard-card-label">Academic standing</div>
          </div>
          <span className={`student-dashboard-badge${identity.academicStatus?.isOnProbation ? ' student-dashboard-badge-warning' : academicStatus?.toLowerCase() === 'regular' ? ' student-dashboard-badge-success' : ''}`}>
            {academicStatus?.toLowerCase() === 'regular' && <CheckCircle2 aria-hidden="true" />}
            {formatStatus(academicStatus)}
          </span>
          <span className="student-dashboard-card-watermark"><GraduationCap aria-hidden="true" /></span>
          <p className="student-dashboard-card-detail">
            {identity.academicStatus?.isOnProbation ? 'Contact your adviser for support.' : 'Current recorded standing'}
          </p>
          <button type="button" className="student-dashboard-card-link" onClick={onViewRecords}>
            View details <ArrowRight aria-hidden="true" />
          </button>
        </article>

        <article className="student-dashboard-card student-dashboard-course-card">
          <div className="student-dashboard-card-topline">
            <span className="student-dashboard-card-icon"><FileText aria-hidden="true" /></span>
            <div className="student-dashboard-card-label">Course / Year Level / Section</div>
          </div>
          <strong className="student-dashboard-card-value">{displayValue(course)}</strong>
          <span className="student-dashboard-card-watermark"><FileText aria-hidden="true" /></span>
          <p className="student-dashboard-card-detail">
            {displayValue(yearLevel)}{section ? ` · Section ${section}` : ''}
          </p>
          <button type="button" className="student-dashboard-card-link" onClick={onEditProfile}>
            View profile <ArrowRight aria-hidden="true" />
          </button>
        </article>

        <article className="student-dashboard-card student-dashboard-profile-card">
          <div className="student-dashboard-card-topline">
            <span className="student-dashboard-card-icon"><UserRound aria-hidden="true" /></span>
            <div className="student-dashboard-card-label">Profile completion</div>
          </div>
          <div className="student-dashboard-profile-content">
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
          </div>
          <button type="button" className="student-dashboard-card-link" onClick={onEditProfile}>
            Complete profile <ArrowRight aria-hidden="true" />
          </button>
        </article>
      </div>

      <div className="student-dashboard-content">
        <section className={`student-dashboard-panel student-dashboard-clearance-panel${isEnrollmentEligible ? ' student-dashboard-clearance-ready' : ''}`} aria-labelledby="student-clearance-heading">
          <div className="student-dashboard-panel-heading">
            <div className="student-dashboard-panel-icon">
              <FileCheck2 aria-hidden="true" />
            </div>
            <div>
              <h3 id="student-clearance-heading">Enrollment clearance</h3>
              <p>Check your enrollment eligibility and download your clearance slip.</p>
            </div>
            <div className="student-dashboard-clearance-header-actions">
              <button
                type="button"
                className="student-dashboard-secondary-button"
                onClick={viewClearanceSlip}
                disabled={!isEnrollmentEligible}
              >
                <FileCheck2 aria-hidden="true" />
                View slip
              </button>
              <button
                type="button"
                className="student-dashboard-primary-button"
                onClick={downloadClearanceSlip}
                disabled={!isEnrollmentEligible}
              >
                <Download aria-hidden="true" />
                Download clearance slip
              </button>
            </div>
          </div>
          {!isEnrollmentEligible && (
            <div className="student-dashboard-clearance-flag" role="status">
              <span className="student-dashboard-clearance-flag-icon">!</span>
              <span>Not yet eligible</span>
              <span className="student-dashboard-clearance-flag-divider" aria-hidden="true" />
              <p>You cannot view or download a clearance slip until your enrollment eligibility is approved.</p>
            </div>
          )}
          <div className="student-dashboard-clearance-body">
            <div className="student-dashboard-clearance-steps" aria-label="Clearance progress">
              <div className="student-dashboard-clearance-step is-current">
                <span>1</span>
                <strong>Enrollment<br />Review</strong>
              </div>
              <span className="student-dashboard-clearance-step-line" aria-hidden="true" />
              <div className={`student-dashboard-clearance-step${evaluationStatus === 'for_review' || isEnrollmentEligible ? ' is-current' : ''}`}>
                <span>2</span>
                <strong>Eligibility<br />Check</strong>
              </div>
              <span className="student-dashboard-clearance-step-line" aria-hidden="true" />
              <div className={`student-dashboard-clearance-step${isEnrollmentEligible ? ' is-current' : ''}`}>
                <span>3</span>
                <strong>Approval</strong>
              </div>
            </div>
          </div>
        </section>

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

      {clearancePreviewUrl && (
        <div className="student-clearance-preview-overlay" role="dialog" aria-modal="true" aria-labelledby="student-clearance-preview-heading">
          <div className="student-clearance-preview-dialog">
            <div className="student-clearance-preview-header">
              <div>
                <h3 id="student-clearance-preview-heading">Enrollment clearance slip</h3>
                <p>Review the mock slip before downloading.</p>
              </div>
              <button
                type="button"
                className="student-clearance-preview-close"
                onClick={() => setClearancePreviewUrl('')}
                aria-label="Close clearance slip preview"
              >
                ×
              </button>
            </div>
            <iframe
              className="student-clearance-preview-frame"
              src={clearancePreviewUrl}
              title="Enrollment clearance slip preview"
            />
            <div className="student-clearance-preview-actions">
              <button type="button" className="student-dashboard-secondary-button" onClick={() => setClearancePreviewUrl('')}>
                Close
              </button>
              <button type="button" className="student-dashboard-primary-button" onClick={downloadClearanceSlip}>
                <Download aria-hidden="true" />
                Download slip
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
