import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Users,
  RefreshCw,
  TrendingUp,
  Award,
  Layers,
  HeartHandshake,
} from 'lucide-react';
import {
  fetchExecutiveAnalytics,
  ExecutiveAnalyticsData,
} from '../../lib/api';
import { formatAcademicGwa } from '../../utils/mongoAcademicGwa';

export const ExecutiveAnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<ExecutiveAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchExecutiveAnalytics();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load executive analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, []);

  if (loading && !data) {
    return (
      <div className="admin-panel admin-loading-state" role="status">
        <BarChart3 className="animate-pulse" />
        Loading College Executive Analytics &amp; Visualizations...
      </div>
    );
  }

  const {
    metrics = {
      totalStudents: 0,
      totalEvaluated: 0,
      evaluationCompletionRate: 0,
      averageCollegeGwa: 0,
      probationCount: 0,
      ipCount: 0,
      pwdCount: 0,
      shifterCount: 0,
      transfereeCount: 0,
    },
    evaluationProgress = {
      evaluated: 0,
      pending: 0,
      completionRate: 0,
      breakdown: { eligible: 0, forReview: 0, notEligible: 0, pending: 0 },
    },
    gwaDistribution = {
      averageGwa: 0,
      gradedCount: 0,
      buckets: { deansList: 0, goodStanding: 0, satisfactory: 0, atRisk: 0, deficient: 0, ungraded: 0 },
    },
    demographics = { ip: 0, pwd: 0, shifter: 0, transferee: 0, probation: 0, regular: 0 },
    programBreakdown = [],
    yearLevelBreakdown = [],
  } = data || {};

  // Compute SVG Ring Chart segments
  const totalStudents = metrics.totalStudents || 1;
  const eligibleAngle = (evaluationProgress.breakdown.eligible / totalStudents) * 360;
  const reviewAngle = (evaluationProgress.breakdown.forReview / totalStudents) * 360;
  const notEligibleAngle = (evaluationProgress.breakdown.notEligible / totalStudents) * 360;
  const pendingAngle = (evaluationProgress.breakdown.pending / totalStudents) * 360;

  // Max bucket for scaling histogram
  const gwaMaxCount = Math.max(
    gwaDistribution.buckets.deansList,
    gwaDistribution.buckets.goodStanding,
    gwaDistribution.buckets.satisfactory,
    gwaDistribution.buckets.atRisk,
    gwaDistribution.buckets.deficient,
    1
  );

  return (
    <div className="admin-page-stack space-y-5" role="tabpanel">
      {/* Header Banner */}
      <section className="admin-panel admin-panel-body">
        <div className="admin-section-heading">
          <div className="flex items-start gap-3">
            <span className="admin-heading-icon"><BarChart3 className="h-4 w-4" /></span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">College Executive Analytics &amp; Dean&apos;s Overview</h2>
              <p className="text-xs text-slate-600">
                Visual insights across student academic performance, evaluation velocity, and special demographic considerations for the College of Technologies.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadAnalytics()}
            disabled={loading}
            className="admin-secondary-button"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh data'}
          </button>
        </div>
        {error && <p role="alert" className="admin-alert admin-alert-error mt-4">{error}</p>}
      </section>

      {/* KPI Stat Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-label="Executive KPI cards">
        <div className="admin-metric p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="admin-metric-label">Enrolled Students</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <p className="admin-metric-value text-2xl font-bold text-slate-900 mt-1">
            {metrics.totalStudents}
          </p>
          <span className="text-[11px] text-slate-500">Active College Roster</span>
        </div>

        <div className="admin-metric p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="admin-metric-label">Evaluation Rate</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="admin-metric-value text-2xl font-bold text-emerald-700 mt-1">
            {evaluationProgress.completionRate}%
          </p>
          <span className="text-[11px] text-slate-500">
            {evaluationProgress.evaluated} of {metrics.totalStudents} completed
          </span>
        </div>

        <div className="admin-metric p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="admin-metric-label">Academic Probation</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="admin-metric-value text-2xl font-bold text-rose-700 mt-1">
            {metrics.probationCount}
          </p>
          <span className="text-[11px] text-slate-500">
            {metrics.totalStudents > 0 ? ((metrics.probationCount / metrics.totalStudents) * 100).toFixed(1) : 0}% of cohort
          </span>
        </div>

        <div className="admin-metric p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="admin-metric-label">Average College GWA</span>
            <Award className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="admin-metric-value text-2xl font-bold text-indigo-700 mt-1">
            {formatAcademicGwa(metrics.averageCollegeGwa)}
          </p>
          <span className="text-[11px] text-slate-500">
            Based on {gwaDistribution.gradedCount} graded students
          </span>
        </div>
      </section>

      {/* Grid: Evaluation Progress Ring + GWA Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Evaluation Progress Ring Chart */}
        <div className="admin-panel admin-panel-body bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Faculty Evaluation Progress</h3>
              <p className="text-xs text-slate-500">Real-time status breakdown across advising faculty</p>
            </div>
            <span className="admin-badge admin-badge-green font-semibold">
              {evaluationProgress.completionRate}% Done
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
            {/* SVG Circular Donut Chart */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90 transform">
                {/* Background Track */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="3.8"
                />
                {/* Eligible (Green) */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.8"
                  strokeDasharray={`${(evaluationProgress.breakdown.eligible / totalStudents) * 100} 100`}
                  strokeDashoffset="0"
                />
                {/* For Review (Amber) */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3.8"
                  strokeDasharray={`${(evaluationProgress.breakdown.forReview / totalStudents) * 100} 100`}
                  strokeDashoffset={`-${(evaluationProgress.breakdown.eligible / totalStudents) * 100}`}
                />
                {/* Not Eligible (Rose) */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3.8"
                  strokeDasharray={`${(evaluationProgress.breakdown.notEligible / totalStudents) * 100} 100`}
                  strokeDashoffset={`-${((evaluationProgress.breakdown.eligible + evaluationProgress.breakdown.forReview) / totalStudents) * 100}`}
                />
              </svg>
              {/* Inner Center Label */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold text-slate-900 leading-none">
                  {evaluationProgress.completionRate}%
                </span>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                  Evaluated
                </span>
              </div>
            </div>

            {/* Legend & Breakdown Stats */}
            <div className="space-y-2 text-xs w-full max-w-[220px]">
              <div className="flex items-center justify-between p-1.5 rounded bg-emerald-50/60 border border-emerald-100">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-emerald-950">Eligible</span>
                </div>
                <strong className="text-emerald-800">{evaluationProgress.breakdown.eligible}</strong>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded bg-amber-50/60 border border-amber-100">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="font-semibold text-amber-950">For Review</span>
                </div>
                <strong className="text-amber-800">{evaluationProgress.breakdown.forReview}</strong>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded bg-rose-50/60 border border-rose-100">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span className="font-semibold text-rose-950">Not Eligible</span>
                </div>
                <strong className="text-rose-800">{evaluationProgress.breakdown.notEligible}</strong>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="font-semibold text-slate-700">Pending Evaluation</span>
                </div>
                <strong className="text-slate-800">{evaluationProgress.breakdown.pending}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Academic Performance & Major GWA Distribution Histogram */}
        <div className="admin-panel admin-panel-body bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Academic GWA Distribution</h3>
              <p className="text-xs text-slate-500">Student cohort grade brackets and standing</p>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Avg: <strong className="text-indigo-600">{formatAcademicGwa(metrics.averageCollegeGwa)}</strong>
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {[
              {
                label: "Dean's / President's List (1.00 – 1.45)",
                count: gwaDistribution.buckets.deansList,
                color: 'bg-emerald-500',
                badge: 'Honor Roll',
              },
              {
                label: 'Good Standing (1.46 – 2.00)',
                count: gwaDistribution.buckets.goodStanding,
                color: 'bg-indigo-500',
                badge: 'Good Standing',
              },
              {
                label: 'Satisfactory (2.01 – 2.50)',
                count: gwaDistribution.buckets.satisfactory,
                color: 'bg-sky-500',
                badge: 'Satisfactory',
              },
              {
                label: 'Conditional / At Risk (2.51 – 3.00)',
                count: gwaDistribution.buckets.atRisk,
                color: 'bg-amber-500',
                badge: 'At Risk',
              },
              {
                label: 'Deficient / Failing (> 3.00)',
                count: gwaDistribution.buckets.deficient,
                color: 'bg-rose-500',
                badge: 'Deficient',
              },
            ].map((bracket) => {
              const pct = gwaMaxCount > 0 ? (bracket.count / gwaMaxCount) * 100 : 0;
              return (
                <div key={bracket.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{bracket.label}</span>
                    <span className="font-bold text-slate-900">
                      {bracket.count} students
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bracket.color} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(pct, bracket.count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid: Demographics Considerations + Program Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 3: Demographics & Special Considerations */}
        <div className="admin-panel admin-panel-body bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Demographic &amp; Special Considerations</h3>
              <p className="text-xs text-slate-500">Monitored student classifications for scheduling and counseling</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-500 block">Indigenous Peoples (IP)</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-bold text-slate-900">{demographics.ip}</span>
                <span className="text-[11px] text-slate-500">
                  {metrics.totalStudents > 0 ? ((demographics.ip / metrics.totalStudents) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-500 block">Persons with Disability (PWD)</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-bold text-slate-900">{demographics.pwd}</span>
                <span className="text-[11px] text-slate-500">
                  {metrics.totalStudents > 0 ? ((demographics.pwd / metrics.totalStudents) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-500 block">Curriculum Shifters</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-bold text-slate-900">{demographics.shifter}</span>
                <span className="text-[11px] text-slate-500">Tracked</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-500 block">College Transferees</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-bold text-slate-900">{demographics.transferee}</span>
                <span className="text-[11px] text-slate-500">Tracked</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: College Department & Program Breakdown */}
        <div className="admin-panel admin-panel-body bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Programs &amp; Year Level Cohorts</h3>
              <p className="text-xs text-slate-500">Enrollment distribution across COT degree programs</p>
            </div>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {programBreakdown.map((prog) => (
              <div
                key={prog.program}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors text-xs"
              >
                <div className="min-w-0 pr-2">
                  <span className="font-semibold text-slate-900 block truncate" title={prog.program}>
                    {prog.program}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Probation: <strong className="text-rose-600">{prog.probationCount}</strong>
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="admin-badge admin-badge-navy font-bold text-xs">
                    {prog.total} students
                  </span>
                </div>
              </div>
            ))}
            {programBreakdown.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">No programs recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
