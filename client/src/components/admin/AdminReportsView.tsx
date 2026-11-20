import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  fetchInstitutionalStudentSummary,
  InstitutionalStudentSummary,
  EnrollmentReportFilters,
  EnrollmentAggregations,
  recordReportExportAudit,
  SystemExportNotification,
} from '../../lib/api';
import { formatAcademicGwa } from '../../utils/mongoAcademicGwa';
import { formatStatusLabel } from '../../utils/formatStatusLabel';
import { Modal } from '../common/Modal';
import {
  exportStudentsToCSV,
  exportStudentsToExcel,
  exportStudentsToPDF,
  printOfficialStudentReport,
} from '../../utils/reportExportUtils';

const ACADEMIC_YEARS = ['2025-2026', '2024-2025', '2023-2024', '2022-2023'];
const SEMESTERS = ['1st Semester', '2nd Semester', 'Midyear'];
const DEPARTMENTS_LIST = [
  { code: 'IT', label: 'Information Technology (IT)' },
  { code: 'EMC', label: 'Entertainment & Multimedia Computing (EMC)' },
  { code: 'ELECTRONICS', label: 'Electronics (ELECTRONICS)' },
  { code: 'FOODTECH', label: 'Food Technology (FOODTECH)' },
  { code: 'AUTOMOTIVE', label: 'Automotive Technology (AUTOMOTIVE)' },
];
const YEAR_LEVELS = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
];
const ENROLLMENT_STATUSES = [
  { value: 'enrolled', label: 'Enrolled (Overall Enrolled)' },
  { value: 'processing', label: 'Processing' },
  { value: 'not_enrolled', label: 'Not Enrolled' },
];

export const AdminReportsView: React.FC = () => {
  const { currentUser } = useApp();
  const isAuthorizedAdmin =
    currentUser?.role === 'admin' &&
    currentUser?.isActive !== false &&
    currentUser?.accountStatus !== 'inactive' &&
    currentUser?.accountStatus !== 'suspended';

  const [students, setStudents] = useState<InstitutionalStudentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statistics, setStatistics] = useState({ ip: 0, pwd: 0, probation: 0, evaluated: 0, enrolled: 0 });
  const [aggregations, setAggregations] = useState<EnrollmentAggregations | null>(null);

  // Optional Filters (A117)
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedYearLevel, setSelectedYearLevel] = useState('');
  const [selectedEnrollmentStatus, setSelectedEnrollmentStatus] = useState('enrolled');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvaluationStudent, setSelectedEvaluationStudent] = useState<InstitutionalStudentSummary | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered');
  const [showFilters, setShowFilters] = useState(true);
  const [notifications, setNotifications] = useState<SystemExportNotification[]>([]);
  const [activeToast, setActiveToast] = useState<SystemExportNotification | null>(null);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedAcademicYear) count++;
    if (selectedSemester) count++;
    if (selectedDepartment) count++;
    if (selectedYearLevel) count++;
    if (selectedEnrollmentStatus && selectedEnrollmentStatus !== 'enrolled') count++;
    if (startDate) count++;
    if (endDate) count++;
    if (search.trim()) count++;
    return count;
  }, [
    selectedAcademicYear,
    selectedSemester,
    selectedDepartment,
    selectedYearLevel,
    selectedEnrollmentStatus,
    startDate,
    endDate,
    search,
  ]);

  const resetFilters = () => {
    setSelectedAcademicYear('');
    setSelectedSemester('');
    setSelectedDepartment('');
    setSelectedYearLevel('');
    setSelectedEnrollmentStatus('enrolled');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setPage(1);
  };

  const currentFilters: EnrollmentReportFilters = useMemo(() => ({
    academicYear: selectedAcademicYear || undefined,
    semester: selectedSemester || undefined,
    department: selectedDepartment || undefined,
    yearLevel: selectedYearLevel || undefined,
    enrollmentStatus: selectedEnrollmentStatus || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: search.trim() || undefined,
  }), [
    selectedAcademicYear,
    selectedSemester,
    selectedDepartment,
    selectedYearLevel,
    selectedEnrollmentStatus,
    startDate,
    endDate,
    search,
  ]);

  const loadReport = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchInstitutionalStudentSummary(page, 20, false, currentFilters);
      setStudents(result.students);
      setTotal(result.pagination.total);
      setTotalPages(Math.max(result.pagination.totalPages, 1));
      setStatistics({
        ip: result.statistics.ip || 0,
        pwd: result.statistics.pwd || 0,
        probation: result.statistics.probation || 0,
        evaluated: result.statistics.evaluated || 0,
        enrolled: result.statistics.enrolled || 0,
      });
      if (result.aggregations) {
        setAggregations(result.aggregations);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load institutional reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, [
    page,
    selectedAcademicYear,
    selectedSemester,
    selectedDepartment,
    selectedYearLevel,
    selectedEnrollmentStatus,
    startDate,
    endDate,
  ]);

  // Trigger re-search with 300ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      void loadReport();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const getExportData = async () => {
    if (exportScope === 'all') {
      setExporting(true);
      try {
        // Overall enrolled students across all programs, year levels, and academic periods (A114 & A115)
        const allRes = await fetchInstitutionalStudentSummary(1, 5000, true, {
          enrollmentStatus: 'enrolled',
        });
        return allRes.students;
      } finally {
        setExporting(false);
      }
    }

    if (total > students.length) {
      setExporting(true);
      try {
        const filteredRes = await fetchInstitutionalStudentSummary(1, 5000, true, currentFilters);
        return filteredRes.students;
      } finally {
        setExporting(false);
      }
    }

    return students;
  };

  const exportOptionsPayload = {
    filterQuery: search,
    generatedBy: currentUser?.fullName || currentUser?.username || 'System Administrator',
    callerRole: currentUser?.role,
    stats: statistics,
    appliedFilters: {
      academicYear: selectedAcademicYear,
      semester: selectedSemester,
      department: selectedDepartment,
      yearLevel: selectedYearLevel,
      enrollmentStatus: selectedEnrollmentStatus,
      dateRange: startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `From ${startDate}` : endDate ? `Until ${endDate}` : '',
    },
    aggregations: aggregations ? {
      byProgram: aggregations.byProgram,
      byYearLevel: aggregations.byYearLevel,
      byAcademicPeriod: aggregations.byAcademicPeriod,
    } : undefined,
  };

  const notifyExportComplete = async (
    format: 'csv' | 'excel' | 'pdf' | 'print',
    recordCount: number,
    fileName: string
  ) => {
    const formatUpper = format.toUpperCase();
    const notifItem: SystemExportNotification = {
      id: `notif-${Date.now()}`,
      type: 'DATA_EXPORT_COMPLETED',
      title: 'Data Export Completed',
      message: `Your enrolled-student report has been generated successfully and is ready to download (${formatUpper}, ${recordCount} records).`,
      format: formatUpper,
      recordCount,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isRead: false,
    };

    setNotifications((prev) => [notifItem, ...prev]);
    setActiveToast(notifItem);

    // Auto dismiss active toast after 6 seconds
    setTimeout(() => {
      setActiveToast((curr) => (curr?.id === notifItem.id ? null : curr));
    }, 6000);

    // Browser native notification (if granted/available)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification('SAPES — Data Export Completed', {
            body: notifItem.message,
            icon: '/favicon.ico',
          });
        } catch {
          // Fallback gracefully
        }
      } else if (Notification.permission === 'default') {
        void Notification.requestPermission();
      }
    }

    // Automated audit logging on backend (A120)
    try {
      await recordReportExportAudit({
        reportName: 'Overall Enrolled Students Report',
        format,
        recordCount,
        exportScope,
        filters: currentFilters,
        fileName,
        status: 'completed',
      });
    } catch (auditErr) {
      console.warn('Report export audit logging note:', auditErr);
    }
  };

  const notifyExportFailure = async (
    format: 'csv' | 'excel' | 'pdf' | 'print',
    errorMessage?: string
  ) => {
    const formatUpper = format.toUpperCase();
    const notifItem: SystemExportNotification = {
      id: `notif-${Date.now()}`,
      type: 'DATA_EXPORT_FAILED',
      title: 'Export Failed',
      message: 'Your report could not be generated. Please try again.',
      format: formatUpper,
      recordCount: 0,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isRead: false,
    };

    setNotifications((prev) => [notifItem, ...prev]);
    setActiveToast(notifItem);

    setTimeout(() => {
      setActiveToast((curr) => (curr?.id === notifItem.id ? null : curr));
    }, 6000);

    try {
      await recordReportExportAudit({
        reportName: 'Overall Enrolled Students Report',
        format,
        recordCount: 0,
        exportScope,
        filters: currentFilters,
        fileName: '',
        status: 'failed',
        errorMessage: errorMessage || 'Failed to export report',
      });
    } catch (auditErr) {
      console.warn('Report export failure audit logging note:', auditErr);
    }
  };

  const handleExportCSV = async () => {
    if (!isAuthorizedAdmin) {
      setError('Export functions are strictly restricted to authorized administrative personnel.');
      return;
    }
    try {
      const dataToExport = await getExportData();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      exportStudentsToCSV(dataToExport, exportOptionsPayload);
      void notifyExportComplete('csv', dataToExport.length, `overall-enrolled-students-${timestamp}.csv`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to export CSV.';
      setError(msg);
      void notifyExportFailure('csv', msg);
    }
  };

  const handleExportExcel = async () => {
    if (!isAuthorizedAdmin) {
      setError('Export functions are strictly restricted to authorized administrative personnel.');
      return;
    }
    try {
      const dataToExport = await getExportData();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      exportStudentsToExcel(dataToExport, exportOptionsPayload);
      void notifyExportComplete('excel', dataToExport.length, `overall-enrolled-students-${timestamp}.xlsx`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to export Excel workbook.';
      setError(msg);
      void notifyExportFailure('excel', msg);
    }
  };

  const handleDownloadPDF = async () => {
    if (!isAuthorizedAdmin) {
      setError('Export functions are strictly restricted to authorized administrative personnel.');
      return;
    }
    try {
      const dataToExport = await getExportData();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      exportStudentsToPDF(dataToExport, exportOptionsPayload);
      void notifyExportComplete('pdf', dataToExport.length, `overall-enrolled-students-${timestamp}.pdf`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to generate direct PDF file.';
      setError(msg);
      void notifyExportFailure('pdf', msg);
    }
  };

  const handlePrintPDF = async () => {
    if (!isAuthorizedAdmin) {
      setError('Export functions are strictly restricted to authorized administrative personnel.');
      return;
    }
    try {
      const dataToExport = await getExportData();
      printOfficialStudentReport(dataToExport, exportOptionsPayload);
      void notifyExportComplete('print', dataToExport.length, 'official-print-report');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to prepare print report.';
      setError(msg);
      void notifyExportFailure('print', msg);
    }
  };

  const metrics = [
    ['Overall Enrolled', statistics.enrolled || total],
    ['Total Records', total],
    ['Evaluated by Faculty', statistics.evaluated],
    ['On Probation', statistics.probation],
    ['IP Students', statistics.ip],
    ['PWD Students', statistics.pwd],
  ] as const;

  return (
    <div className="admin-page-stack" role="tabpanel">
      {/* Page Heading Banner */}
      <section className="admin-panel admin-panel-body">
        <div className="admin-section-heading">
          <div className="flex items-start gap-3">
            <span className="admin-heading-icon"><FileCheck2 className="h-5 w-5 text-indigo-600" /></span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Overall Enrolled Students &amp; Academic Reports</h2>
              <p className="text-sm text-slate-500">
                Retrieve, aggregate, filter, and export official student enrollment records across all academic programs, year levels, and terms.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNotificationsDrawer(!showNotificationsDrawer)}
              className={`admin-secondary-button relative text-xs py-1.5 px-3 ${showNotificationsDrawer ? 'bg-slate-100 font-semibold' : ''}`}
              title="System Export Notifications"
              aria-label="Export notifications"
            >
              <Bell className="h-4 w-4 text-slate-600" />
              <span>Notifications</span>
              {unreadNotificationsCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`admin-secondary-button text-xs py-1.5 px-3 ${showFilters ? 'bg-slate-100 font-semibold' : ''}`}
            >
              <Filter className="h-4 w-4" />
              <span>Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
            </button>
            <button
              type="button"
              onClick={() => void loadReport()}
              disabled={loading}
              className="admin-secondary-button text-xs py-1.5 px-3"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {error && <p role="alert" className="admin-alert admin-alert-error mt-4">{error}</p>}
      </section>

      {/* Floating System Export Notification Toast (A122) */}
      {activeToast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-5 right-5 z-50 flex max-w-md items-start gap-3 rounded-2xl border p-4 shadow-2xl transition ${
            activeToast.type === 'DATA_EXPORT_FAILED'
              ? 'border-red-300 bg-white dark:border-red-800 dark:bg-slate-900'
              : 'border-emerald-300 bg-white dark:border-emerald-800 dark:bg-slate-900'
          }`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              activeToast.type === 'DATA_EXPORT_FAILED'
                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
            }`}
          >
            {activeToast.type === 'DATA_EXPORT_FAILED' ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {activeToast.title}
              </h4>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  activeToast.type === 'DATA_EXPORT_FAILED'
                    ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
              >
                {activeToast.format}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {activeToast.message}
            </p>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
              <span>{activeToast.timestamp}</span>
              <span
                className={`font-semibold ${
                  activeToast.type === 'DATA_EXPORT_FAILED'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {activeToast.type === 'DATA_EXPORT_FAILED'
                  ? 'Audit Log Recorded (Failed)'
                  : 'Automated Audit Log Recorded'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveToast(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* System Export Notifications Drawer (A122) */}
      {showNotificationsDrawer && (
        <section className="admin-panel p-4 bg-emerald-50/40 border border-emerald-200 rounded-xl" aria-label="System export notifications">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 mb-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-emerald-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                System Export Notifications ({notifications.length})
              </h3>
            </div>
            <div className="flex items-center gap-3">
              {unreadNotificationsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
                >
                  Mark all as read
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowNotificationsDrawer(false)}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium"
              >
                Close
              </button>
            </div>
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No export notifications recorded yet in this session. When you export to Excel, CSV, or PDF, completion alerts will appear here.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notifications.map((n) => {
                const isFailed = n.type === 'DATA_EXPORT_FAILED';
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) {
                        setNotifications((prev) =>
                          prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
                        );
                      }
                    }}
                    className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border text-xs shadow-xs cursor-pointer transition ${
                      isFailed ? 'bg-red-50/50 border-red-200' : 'bg-white border-emerald-100'
                    } ${!n.isRead ? 'ring-1 ring-emerald-400' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isFailed ? (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      )}
                      <span className="font-medium text-slate-800 truncate">{n.message}</span>
                      {!n.isRead && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" title="Unread" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-[10px] text-slate-400">
                      <span
                        className={`font-semibold uppercase px-1.5 py-0.5 rounded ${
                          isFailed
                            ? 'text-red-700 bg-red-100'
                            : 'text-emerald-700 bg-emerald-50'
                        }`}
                      >
                        {n.format}
                      </span>
                      <span>{n.timestamp}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* FILTER CONTROLS (A117) */}
      {showFilters && (
        <section className="admin-panel p-4 bg-slate-50/70 border-t border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Report Filters (Academic Year, Semester, Department, Year Level &amp; Date Range)
              </h3>
              {activeFiltersCount > 0 && (
                <span className="admin-badge admin-badge-navy text-[11px] px-2 py-0.5">
                  {activeFiltersCount} active
                </span>
              )}
            </div>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-medium"
              >
                <RotateCcw className="h-3 w-3" />
                Reset filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Department */}
            <div>
              <label htmlFor="filter-department" className="block font-semibold text-slate-700 mb-1">
                Department / Program
              </label>
              <select
                id="filter-department"
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Departments (College-wide)</option>
                {DEPARTMENTS_LIST.map((dept) => (
                  <option key={dept.code} value={dept.code}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <label htmlFor="filter-academic-year" className="block font-semibold text-slate-700 mb-1">
                Academic Year
              </label>
              <select
                id="filter-academic-year"
                value={selectedAcademicYear}
                onChange={(e) => {
                  setSelectedAcademicYear(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Academic Years</option>
                {ACADEMIC_YEARS.map((ay) => (
                  <option key={ay} value={ay}>
                    {ay}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester */}
            <div>
              <label htmlFor="filter-semester" className="block font-semibold text-slate-700 mb-1">
                Semester / Academic Period
              </label>
              <select
                id="filter-semester"
                value={selectedSemester}
                onChange={(e) => {
                  setSelectedSemester(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Semesters</option>
                {SEMESTERS.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Level */}
            <div>
              <label htmlFor="filter-year-level" className="block font-semibold text-slate-700 mb-1">
                Year Level
              </label>
              <select
                id="filter-year-level"
                value={selectedYearLevel}
                onChange={(e) => {
                  setSelectedYearLevel(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Year Levels (1st - 4th)</option>
                {YEAR_LEVELS.map((yl) => (
                  <option key={yl.value} value={yl.value}>
                    {yl.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Enrollment Status */}
            <div>
              <label htmlFor="filter-enrollment-status" className="block font-semibold text-slate-700 mb-1">
                Enrollment Status
              </label>
              <select
                id="filter-enrollment-status"
                value={selectedEnrollmentStatus}
                onChange={(e) => {
                  setSelectedEnrollmentStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none font-medium"
              >
                <option value="all">All Statuses (Enrolled &amp; Others)</option>
                {ENROLLMENT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range: Start */}
            <div>
              <label htmlFor="filter-start-date" className="block font-semibold text-slate-700 mb-1">
                From Date (Enrollment / Creation)
              </label>
              <div className="relative">
                <input
                  id="filter-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Date Range: End */}
            <div>
              <label htmlFor="filter-end-date" className="block font-semibold text-slate-700 mb-1">
                To Date
              </label>
              <div className="relative">
                <input
                  id="filter-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Search */}
            <div>
              <label htmlFor="filter-search-box" className="block font-semibold text-slate-700 mb-1">
                Keyword / Student Search
              </label>
              <div className="relative">
                <input
                  id="filter-search-box"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ID, name, status, remarks..."
                  className="w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* METRIC GRID & AGGREGATIONS (A115) */}
      <section className="admin-metric-grid" aria-label="Institutional metrics">
        {metrics.map(([label, value]) => (
          <div key={label} className="admin-metric">
            <p className="admin-metric-label">{label}</p>
            <p className="admin-metric-value">{value}</p>
          </div>
        ))}
      </section>

      {/* MULTI-DIMENSIONAL AGGREGATIONS (A115) */}
      {aggregations && (
        <section className="admin-panel p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Aggregated Enrollment Summaries Across Programs &amp; Year Levels (A115)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* By Program */}
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <h4 className="font-semibold text-slate-700 mb-2 flex items-center justify-between">
                <span>By Academic Program</span>
                <span className="text-[11px] text-slate-500">Enrolled / Total</span>
              </h4>
              <div className="space-y-1.5">
                {aggregations.byProgram.map((prog) => (
                  <div key={prog.program} className="flex items-center justify-between py-1 border-b border-slate-200/60 last:border-0">
                    <span className="text-slate-700 truncate max-w-[260px]" title={prog.program}>
                      <span className="font-semibold text-slate-900 admin-mono mr-1">[{prog.departmentCode}]</span>
                      {prog.program}
                    </span>
                    <span className="font-medium text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      <strong className="text-emerald-700">{prog.enrolled}</strong> / {prog.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Year Level */}
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <h4 className="font-semibold text-slate-700 mb-2 flex items-center justify-between">
                <span>By Year Level</span>
                <span className="text-[11px] text-slate-500">Enrolled / Total</span>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {aggregations.byYearLevel.map((yl) => (
                  <div key={String(yl.yearLevel)} className="rounded-md border border-slate-200 bg-white p-2 text-center">
                    <span className="block text-slate-500 text-[11px] font-medium">{yl.label}</span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                      <span className="text-emerald-700">{yl.enrolled}</span>
                      <span className="text-xs text-slate-500 font-normal"> / {yl.total}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* MASTERLIST ROSTER & EXPORT CONTROLS (A114 & A116) */}
      <section className="admin-panel overflow-hidden">
        <div className="admin-toolbar flex-wrap gap-3 border-b border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Export Scope:</span>
            <div className="flex items-center text-xs font-medium text-slate-600 bg-slate-100 rounded-lg p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setExportScope('filtered')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  exportScope === 'filtered'
                    ? 'bg-white font-semibold text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Export matching records based on active filters"
              >
                Filtered ({total})
              </button>
              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  exportScope === 'all'
                    ? 'bg-white font-semibold text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Export overall enrolled student dataset college-wide"
              >
                Overall Enrolled Students
              </button>
            </div>
          </div>

          {/* Export Action Buttons (Excel, CSV, PDF Download, Print) (A114 & A116) */}
          <div className="flex items-center flex-wrap gap-2 ml-auto">
            {!isAuthorizedAdmin && (
              <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5" role="alert">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                <span>Export restricted to active administrators</span>
              </div>
            )}

            {/* Excel (.xlsx) */}
            <button
              type="button"
              onClick={() => void handleExportExcel()}
              disabled={loading || exporting || students.length === 0 || !isAuthorizedAdmin}
              className="admin-secondary-button text-xs py-1.5 px-3 min-h-0 text-emerald-800 hover:text-emerald-900 font-semibold"
              title={isAuthorizedAdmin ? "Download Microsoft Excel formatted workbook (.xlsx) with BukSU header and aggregations" : "Export functions are restricted strictly to authorized administrative accounts"}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export Excel (.xlsx)</span>
            </button>

            {/* CSV (.csv) */}
            <button
              type="button"
              onClick={() => void handleExportCSV()}
              disabled={loading || exporting || students.length === 0 || !isAuthorizedAdmin}
              className="admin-secondary-button text-xs py-1.5 px-3 min-h-0"
              title={isAuthorizedAdmin ? "Download standard CSV spreadsheet with UTF-8 BOM" : "Export functions are restricted strictly to authorized administrative accounts"}
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>

            {/* PDF (.pdf) Direct Download */}
            <button
              type="button"
              onClick={() => void handleDownloadPDF()}
              disabled={loading || exporting || students.length === 0 || !isAuthorizedAdmin}
              className="admin-secondary-button text-xs py-1.5 px-3 min-h-0 text-rose-700 hover:text-rose-900 font-semibold"
              title={isAuthorizedAdmin ? "Download direct vector PDF report document (.pdf) via jsPDF" : "Export functions are restricted strictly to authorized administrative accounts"}
            >
              <FileText className="h-3.5 w-3.5 text-rose-600" />
              <span>Download PDF (.pdf)</span>
            </button>

            {/* Print Official PDF */}
            <button
              type="button"
              onClick={() => void handlePrintPDF()}
              disabled={loading || exporting || students.length === 0 || !isAuthorizedAdmin}
              className="admin-secondary-button text-xs py-1.5 px-3 min-h-0 text-indigo-700 hover:text-indigo-900 font-semibold"
              title={isAuthorizedAdmin ? "Generate printable official report with formal Dean/Chairperson sign-offs" : "Export functions are restricted strictly to authorized administrative accounts"}
            >
              <Printer className="h-3.5 w-3.5 text-indigo-600" />
              <span>Print Official Report</span>
            </button>
          </div>
        </div>

        {/* Student Masterlist Table */}
        <div className="admin-table-wrap">
          <table className="admin-table" aria-label="Institutional student analytics">
            <thead>
              <tr>
                <th>Student</th>
                <th>Program / Dept</th>
                <th>Year &amp; Section</th>
                <th>Enrollment Status</th>
                <th>Classification</th>
                <th>Academic Standing</th>
                <th>Period GWA</th>
                <th>Faculty Evaluation</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const name = [
                  student.personalInformation?.lastName,
                  student.personalInformation?.firstName,
                  student.personalInformation?.middleName,
                ].filter(Boolean).join(', ');

                const classifications = [
                  student.classification?.studentType,
                  student.classification?.isIP ? 'IP' : '',
                  student.classification?.isPWD ? 'PWD' : '',
                  student.classification?.isShifter ? 'Shifter' : '',
                  student.classification?.isTransferee ? 'Transferee' : '',
                ].filter(Boolean) as string[];

                const academicStatus = formatStatusLabel(student.academicStatus?.currentStatus || 'Regular');
                const rawEvaluationStatus = student.facultyEvaluation?.evaluationStatus;
                const evaluationStatus = formatStatusLabel(rawEvaluationStatus || 'Pending');

                const isEnrolled = (student.enrollmentStatus || '').toLowerCase() === 'enrolled';

                return (
                  <tr key={student.institutionId}>
                    <td>
                      <span className="admin-table-primary font-semibold text-slate-900">
                        {name || 'Name not recorded'}
                      </span>
                      <span className="admin-table-secondary admin-mono text-xs text-slate-500">
                        {student.institutionId}
                      </span>
                    </td>
                    <td>
                      <span className="admin-table-primary text-xs font-medium text-slate-800 line-clamp-1 max-w-[200px]" title={student.program}>
                        {student.program || 'General Curriculum'}
                      </span>
                      <span className="admin-badge admin-badge-navy text-[10px] mt-0.5">
                        {student.department || 'COT'}
                      </span>
                    </td>
                    <td>
                      <span className="font-semibold text-slate-800 text-xs">
                        {student.yearLevel ? `Year ${student.yearLevel}` : 'Year 1'}
                      </span>
                      <span className="text-slate-500 text-xs block">
                        Sec {student.section || 'A'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${
                          isEnrolled
                            ? 'admin-badge-green'
                            : (student.enrollmentStatus || '').toLowerCase() === 'processing'
                            ? 'admin-badge-amber'
                            : 'admin-badge-red'
                        }`}
                      >
                        {formatStatusLabel(student.enrollmentStatus || 'Enrolled')}
                      </span>
                    </td>
                    <td>
                      <div className="flex max-w-44 flex-wrap gap-1">
                        {classifications.length ? (
                          classifications.map((item) => (
                            <span key={item} className="admin-badge admin-badge-navy text-[10px]">
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs">Regular</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`admin-badge ${student.academicStatus?.isOnProbation ? 'admin-badge-red' : 'admin-badge-navy'}`}>
                        {academicStatus}
                      </span>
                      {student.academicStatus?.isOnProbation && (
                        <span className="block text-[10px] text-rose-600 mt-0.5 font-medium">On Probation</span>
                      )}
                    </td>
                    <td>
                      {student.latestAcademicPeriod ? (
                        <>
                          <span className="admin-table-primary admin-number text-xs">
                            O: {formatAcademicGwa(student.latestAcademicPeriod.overallGwa)} / M: {formatAcademicGwa(student.latestAcademicPeriod.majorSubjectGwa)}
                          </span>
                          <span className="admin-table-secondary text-[11px]">
                            {student.latestAcademicPeriod.academicYear} · {student.latestAcademicPeriod.semester}
                          </span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">
                            Cum: {formatAcademicGwa(student.overallGwa)}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 text-xs">Not recorded</span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`admin-badge text-[10px] ${
                            !rawEvaluationStatus || rawEvaluationStatus.toLowerCase() === 'pending'
                              ? 'admin-badge-amber'
                              : rawEvaluationStatus.toLowerCase() === 'eligible'
                              ? 'admin-badge-green'
                              : 'admin-badge-red'
                          }`}
                        >
                          {evaluationStatus}
                        </span>

                        {student.facultyEvaluation ? (
                          <div className="flex flex-col items-start gap-0.5 mt-0.5">
                            <button
                              type="button"
                              onClick={() => setSelectedEvaluationStudent(student)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 hover:text-indigo-900 underline"
                              title="Click to view recorded remarks and details"
                            >
                              <Eye className="w-3 h-3" />
                              View remarks
                            </button>
                            {student.facultyEvaluation.remarks && (
                              <span className="text-[11px] text-slate-500 line-clamp-1 max-w-[180px]" title={student.facultyEvaluation.remarks}>
                                &ldquo;{student.facultyEvaluation.remarks}&rdquo;
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Awaiting evaluation</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan={8} className="admin-empty-state">
                    <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <strong className="text-slate-800">No matching enrolled students</strong>
                    <span className="text-xs text-slate-500">
                      Try clearing or adjusting the Academic Year, Department, Date Range, or Keyword filter.
                    </span>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="admin-secondary-button text-xs mt-3 mx-auto"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset all filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="admin-pagination">
          <span>
            Page {page} of {totalPages} / {total} total students matching
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={loading || page <= 1}
              className="admin-secondary-button min-h-0 px-3 py-2 text-xs"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={loading || page >= totalPages}
              className="admin-secondary-button min-h-0 px-3 py-2 text-xs"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Modal for viewing recorded faculty evaluation statuses and remarks */}
      {selectedEvaluationStudent && (
        <Modal
          isOpen={Boolean(selectedEvaluationStudent)}
          onClose={() => setSelectedEvaluationStudent(null)}
          title="Faculty Evaluation Details & Remarks"
          subtitle={`Recorded evaluation for student ID: ${selectedEvaluationStudent.institutionId}`}
          maxWidth="lg"
          actions={
            <div className="flex w-full justify-end">
              <button
                type="button"
                onClick={() => setSelectedEvaluationStudent(null)}
                className="admin-secondary-button"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900 text-base">
                    {[
                      selectedEvaluationStudent.personalInformation?.firstName,
                      selectedEvaluationStudent.personalInformation?.lastName,
                    ].filter(Boolean).join(' ') || 'Student'}
                  </h4>
                  <p className="text-xs text-slate-500 admin-mono mt-0.5">
                    Institution ID: {selectedEvaluationStudent.institutionId} · {selectedEvaluationStudent.program}
                  </p>
                </div>
                <span
                  className={`admin-badge text-xs px-2.5 py-1 ${
                    (selectedEvaluationStudent.facultyEvaluation?.evaluationStatus || '').toLowerCase() === 'eligible'
                      ? 'admin-badge-green'
                      : (selectedEvaluationStudent.facultyEvaluation?.evaluationStatus || '').toLowerCase() === 'for_review'
                      ? 'admin-badge-amber'
                      : 'admin-badge-red'
                  }`}
                >
                  {formatStatusLabel(selectedEvaluationStudent.facultyEvaluation?.evaluationStatus || 'Pending')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-md border border-slate-200 p-2.5 bg-white">
                <span className="text-slate-500 block mb-0.5">Evaluated by</span>
                <span className="font-medium text-slate-800">
                  {selectedEvaluationStudent.facultyEvaluation?.faculty?.username
                    ? `Faculty: ${selectedEvaluationStudent.facultyEvaluation.faculty.username} (${selectedEvaluationStudent.facultyEvaluation.faculty.role || 'faculty'})`
                    : 'Faculty Evaluator'}
                </span>
              </div>
              <div className="rounded-md border border-slate-200 p-2.5 bg-white">
                <span className="text-slate-500 block mb-0.5">Evaluation Timestamp</span>
                <span className="font-medium text-slate-800">
                  {selectedEvaluationStudent.facultyEvaluation?.evaluatedAt
                    ? new Date(selectedEvaluationStudent.facultyEvaluation.evaluatedAt).toLocaleString()
                    : 'Not recorded'}
                </span>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Evaluation Reasons / Factors
              </h5>
              {selectedEvaluationStudent.facultyEvaluation?.reasons && selectedEvaluationStudent.facultyEvaluation.reasons.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedEvaluationStudent.facultyEvaluation.reasons.map((reason, idx) => (
                    <span key={idx} className="admin-badge admin-badge-navy text-xs">
                      {reason}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No specific reasons flagged.</p>
              )}
            </div>

            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Faculty Remarks &amp; Feedback Notes
              </h5>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-800 leading-relaxed min-h-[80px]">
                {selectedEvaluationStudent.facultyEvaluation?.remarks?.trim() ? (
                  <p className="whitespace-pre-wrap">{selectedEvaluationStudent.facultyEvaluation.remarks}</p>
                ) : (
                  <p className="text-slate-400 italic">No qualitative remarks entered by the evaluator.</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
