import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Download,
  X,
  FileCheck,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import {
  bulkImportStudents,
  BulkImportStudentPayload,
  BulkImportResults,
} from '../../lib/api';

interface BulkStudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ParsedPreviewRow {
  rowNumber: number;
  institutionId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  program: string;
  yearLevel: number;
  section: string;
  studentType: string;
  religion: string;
  isIP: boolean;
  isPWD: boolean;
  isShifter: boolean;
  isTransferee: boolean;
  academicStatus: string;
  isValid: boolean;
  errors: string[];
}

export const BulkStudentImportModal: React.FC<BulkStudentImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedPreviewRow[]>([]);
  const [loadingFile, setLoadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [importResults, setImportResults] = useState<BulkImportResults | null>(null);

  const resetState = () => {
    setFileName('');
    setParsedRows([]);
    setLoadingFile(false);
    setSubmitting(false);
    setError('');
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const downloadSampleTemplate = () => {
    const templateData = [
      [
        'Student ID',
        'First Name',
        'Last Name',
        'Middle Name',
        'Institutional Email',
        'Program',
        'Year Level',
        'Section',
        'Student Type',
        'Religion',
        'Is IP',
        'Is PWD',
        'Is Shifter',
        'Is Transferee',
        'Academic Status',
      ],
      [
        '2024-0001',
        'Maria',
        'Santos',
        'Cruz',
        '2024-0001@student.buksu.edu.ph',
        'Bachelor of Information Technology',
        '1',
        '1A',
        'Regular',
        'Roman Catholic',
        'No',
        'No',
        'No',
        'No',
        'Regular',
      ],
      [
        '2024-0002',
        'Angelo',
        'Dela Cruz',
        'Reyes',
        '2024-0002@student.buksu.edu.ph',
        'Entertainment and Multimedia Computing',
        '2',
        '2B',
        'Regular',
        'Seventh-day Adventist',
        'Yes',
        'No',
        'No',
        'No',
        'Regular',
      ],
      [
        '2024-0003',
        'Joshua',
        'Lumapas',
        'B.',
        '2024-0003@student.buksu.edu.ph',
        'Bachelor of Information Technology',
        '3',
        '3A',
        'Irregular',
        'Evangelical',
        'No',
        'No',
        'Yes',
        'No',
        'On academic probation',
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 16 }, // ID
      { wch: 18 }, // First
      { wch: 18 }, // Last
      { wch: 14 }, // Middle
      { wch: 32 }, // Email
      { wch: 36 }, // Program
      { wch: 12 }, // Year
      { wch: 12 }, // Section
      { wch: 14 }, // Type
      { wch: 22 }, // Religion
      { wch: 10 }, // IP
      { wch: 10 }, // PWD
      { wch: 10 }, // Shifter
      { wch: 14 }, // Transferee
      { wch: 22 }, // Academic Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'sapes_student_import_template.xlsx');
  };

  const parseBooleanVal = (val: unknown): boolean => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val === 1;
    if (typeof val === 'string') {
      const s = val.trim().toLowerCase();
      return s === 'true' || s === 'yes' || s === 'y' || s === '1';
    }
    return false;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoadingFile(true);
    setError('');
    setImportResults(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rawRows.length === 0) {
        throw new Error('The uploaded file contains no data rows.');
      }

      const seenIds = new Set<string>();
      const parsed: ParsedPreviewRow[] = rawRows.map((row, index) => {
        const rowNumber = index + 1;
        const rowErrors: string[] = [];

        const institutionId = String(
          row['Student ID'] || row.studentId || row.institutionId || row['ID Number'] || ''
        ).trim();
        const firstName = String(row['First Name'] || row.firstName || '').trim();
        const lastName = String(row['Last Name'] || row.lastName || '').trim();
        const middleName = String(row['Middle Name'] || row.middleName || '').trim();
        const program = String(
          row['Program'] || row.course || row.program || 'Bachelor of Information Technology'
        ).trim();
        const yearLevelNum = Number(row['Year Level'] || row.yearLevel || 1);
        const section = String(row['Section'] || row.section || '').trim();
        const studentType = String(row['Student Type'] || row.studentType || 'Regular').trim();
        const religion = String(row['Religion'] || row.religion || '').trim();
        const academicStatus = String(
          row['Academic Status'] || row.status || row.academicStatus || 'Regular'
        ).trim();

        const isIP = parseBooleanVal(row['Is IP'] || row.isIP);
        const isPWD = parseBooleanVal(row['Is PWD'] || row.isPWD);
        const isShifter = parseBooleanVal(row['Is Shifter'] || row.isShifter);
        const isTransferee = parseBooleanVal(row['Is Transferee'] || row.isTransferee);

        if (!institutionId) {
          rowErrors.push('Missing Student ID');
        } else if (seenIds.has(institutionId)) {
          rowErrors.push('Duplicate ID in uploaded file');
        } else {
          seenIds.add(institutionId);
        }

        if (!firstName) {
          rowErrors.push('Missing First Name');
        }
        if (!lastName) {
          rowErrors.push('Missing Last Name');
        }
        if (yearLevelNum < 1 || yearLevelNum > 6) {
          rowErrors.push('Year level must be 1-6');
        }

        return {
          rowNumber,
          institutionId,
          firstName,
          lastName,
          middleName,
          program,
          yearLevel: isNaN(yearLevelNum) ? 1 : yearLevelNum,
          section,
          studentType,
          religion,
          isIP,
          isPWD,
          isShifter,
          isTransferee,
          academicStatus,
          isValid: rowErrors.length === 0,
          errors: rowErrors,
        };
      });

      setParsedRows(parsed);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Unable to parse spreadsheet.');
      setParsedRows([]);
    } finally {
      setLoadingFile(false);
    }
  };

  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setError('There are no valid student rows to import.');
      return;
    }

    setSubmitting(true);
    setError('');

    const payload: BulkImportStudentPayload[] = validRows.map((r) => ({
      institutionId: r.institutionId,
      firstName: r.firstName,
      lastName: r.lastName,
      middleName: r.middleName,
      program: r.program,
      yearLevel: r.yearLevel,
      section: r.section,
      studentType: r.studentType,
      religion: r.religion,
      isIP: r.isIP,
      isPWD: r.isPWD,
      isShifter: r.isShifter,
      isTransferee: r.isTransferee,
      academicStatus: r.academicStatus,
    }));

    try {
      const results = await bulkImportStudents(payload);
      setImportResults(results);
      if (onSuccess) {
        onSuccess();
      }
    } catch (reqError) {
      setError(reqError instanceof Error ? reqError.message : 'Bulk import execution failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Student & Academic Record Ingestion"
      subtitle="Import student masterlists and demographic profiles via standard CSV or Excel files."
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {error && <p role="alert" className="admin-alert admin-alert-error">{error}</p>}

        {/* Step 1: Template and File Picker */}
        {!importResults && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Step 1: Download Template or Prepare File</h4>
                <p className="text-xs text-slate-600">
                  Ensure column headers match the SAPES standard format (CSV, XLSX, or XLS).
                </p>
              </div>
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="admin-secondary-button text-xs py-1.5 px-3 whitespace-nowrap min-h-0 text-indigo-700 hover:text-indigo-900"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Sample Template (.xlsx)</span>
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 text-center bg-white hover:bg-slate-50/50 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={(e) => void handleFileUpload(e)}
                className="hidden"
                id="bulk-student-file-input"
              />
              <label
                htmlFor="bulk-student-file-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="text-sm font-semibold text-slate-800">
                  {fileName ? (
                    <span className="text-indigo-600">{fileName}</span>
                  ) : (
                    'Click to browse or drag & drop CSV or Excel file'
                  )}
                </div>
                <p className="text-xs text-slate-500">Supports .csv, .xlsx, and .xls up to 2,000 rows</p>
              </label>
            </div>
          </div>
        )}

        {/* Loading state while parsing spreadsheet */}
        {loadingFile && (
          <div className="p-4 text-center text-slate-600 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
            Analyzing and validating spreadsheet rows...
          </div>
        )}

        {/* Step 2: Pre-Validation Review Table */}
        {!importResults && parsedRows.length > 0 && !loadingFile && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Step 2: Pre-Validation Inspection</h4>
                <p className="text-xs text-slate-600">
                  Preview parsed rows and verify that required student identifiers are correct.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="admin-badge admin-badge-green font-semibold">
                  <CheckCircle2 className="h-3 w-3" /> {validCount} Valid
                </span>
                {invalidCount > 0 && (
                  <span className="admin-badge admin-badge-red font-semibold">
                    <AlertTriangle className="h-3 w-3" /> {invalidCount} Issues
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="admin-table text-xs">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Status</th>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Program</th>
                    <th>Year/Sec</th>
                    <th>Demographics</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={!row.isValid ? 'bg-rose-50/60' : undefined}
                    >
                      <td className="font-mono text-slate-500">{row.rowNumber}</td>
                      <td>
                        {row.isValid ? (
                          <span className="admin-badge admin-badge-green text-[10px]">Ready</span>
                        ) : (
                          <span
                            className="admin-badge admin-badge-red text-[10px]"
                            title={row.errors.join('; ')}
                          >
                            {row.errors[0]}
                          </span>
                        )}
                      </td>
                      <td className="admin-mono font-semibold">{row.institutionId || '—'}</td>
                      <td>
                        <span className="font-semibold text-slate-900">
                          {row.lastName}, {row.firstName} {row.middleName || ''}
                        </span>
                      </td>
                      <td className="text-slate-600 max-w-[140px] truncate" title={row.program}>
                        {row.program}
                      </td>
                      <td className="text-slate-600">
                        Y{row.yearLevel} {row.section || ''}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          {row.isIP && <span className="admin-badge admin-badge-navy text-[10px]">IP</span>}
                          {row.isPWD && <span className="admin-badge admin-badge-navy text-[10px]">PWD</span>}
                          {row.isShifter && <span className="admin-badge admin-badge-amber text-[10px]">Shifter</span>}
                          {!row.isIP && !row.isPWD && !row.isShifter && (
                            <span className="text-slate-400 text-[10px]">Regular</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={resetState}
                className="admin-secondary-button text-xs py-1.5 px-3 min-h-0"
              >
                Clear &amp; Pick Another File
              </button>

              <button
                type="button"
                onClick={() => void handleExecuteImport()}
                disabled={submitting || validCount === 0}
                className="admin-primary-button text-xs py-2 px-4"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Importing {validCount} records...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="h-3.5 w-3.5" />
                    <span>Proceed with Import ({validCount} students)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success Report Summary */}
        {importResults && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Bulk Ingestion Completed</span>
              </div>
              <p className="text-sm text-emerald-900">
                Processed <strong>{importResults.totalRows}</strong> records from the file:
              </p>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="bg-white p-3 rounded border border-emerald-200 text-center">
                  <span className="block text-xl font-bold text-emerald-700">{importResults.createdCount}</span>
                  <span className="text-xs text-slate-600">New Students Created</span>
                </div>
                <div className="bg-white p-3 rounded border border-emerald-200 text-center">
                  <span className="block text-xl font-bold text-indigo-700">{importResults.updatedCount}</span>
                  <span className="text-xs text-slate-600">Existing Records Updated</span>
                </div>
                <div className="bg-white p-3 rounded border border-emerald-200 text-center">
                  <span className="block text-xl font-bold text-amber-700">{importResults.skippedCount}</span>
                  <span className="text-xs text-slate-600">Skipped / Errors</span>
                </div>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Flagged Rows ({importResults.errors.length})</span>
                </div>
                <ul className="text-xs text-amber-800 space-y-1 max-h-36 overflow-y-auto pl-4 list-disc">
                  {importResults.errors.map((err, i) => (
                    <li key={i}>
                      Row {err.row} (ID: {err.institutionId}): {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetState}
                className="admin-secondary-button text-xs py-1.5 px-3 min-h-0"
              >
                Import Another Batch
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="admin-primary-button text-xs py-2 px-4"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
