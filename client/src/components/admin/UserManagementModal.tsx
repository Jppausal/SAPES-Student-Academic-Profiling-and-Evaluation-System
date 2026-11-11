import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserAccount, UserRole } from '../../types';
import { Modal } from '../common/Modal';
import {
  Save,
  GraduationCap,
  Users,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sparkles,
  Info,
  User,
  CheckCircle2
} from 'lucide-react';
import { TECHNOLOGY_PROGRAMS } from '../../lib/academicPrograms';
import { generateApiPassword, fetchIntegrationSettings } from '../../lib/api';

const FACULTY_DEPARTMENTS = [
  { code: 'IT', name: 'Information Technology', label: 'Information Technology (IT)' },
  { code: 'EMC', name: 'Entertainment and Multimedia Computing', label: 'Entertainment and Multimedia Computing (EMC)' },
  { code: 'ELECTRONICS', name: 'Electronics', label: 'Electronics Technology' },
  { code: 'FOODTECH', name: 'Food Technology', label: 'Food Technology' },
  { code: 'AUTOMOTIVE', name: 'Automotive Technology', label: 'Automotive Technology' },
];

const extractStudentId = (email: string) =>
  email.trim().toLowerCase().match(/^([0-9]+)@student\.buksu\.edu\.ph$/)?.[1] || '';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: UserAccount | null;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  userToEdit,
}) => {
  const { createUserAccount, saveUserAccount } = useApp();

  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [studentNumber, setStudentNumber] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [department, setDepartment] = useState<string>(TECHNOLOGY_PROGRAMS[0].value);
  const [accountStatus, setAccountStatus] = useState<'active' | 'inactive' | 'suspended'>('active');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);
  const [passwordGenNotice, setPasswordGenNotice] = useState('');
  const [isPasswordGenEnabled, setIsPasswordGenEnabled] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchIntegrationSettings()
        .then((data) => {
          setIsPasswordGenEnabled(data?.integrations?.passwordGenerator?.enabled !== false);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (userToEdit) {
      const idNumber = userToEdit.studentNumber || userToEdit.username || '';
      setUsername(userToEdit.username);
      setFirstName(userToEdit.firstName || userToEdit.fullName.split(' ')[0] || '');
      setLastName(userToEdit.lastName || userToEdit.fullName.split(' ').slice(1).join(' '));
      setEmail(userToEdit.email);
      setRole(userToEdit.role);
      setStudentNumber(idNumber);
      setFacultyId(userToEdit.facultyId || userToEdit.employeeId || '');
      setDepartment(
        userToEdit.department ||
        (userToEdit.role === 'student'
          ? TECHNOLOGY_PROGRAMS[0].value
          : userToEdit.role === 'faculty'
            ? FACULTY_DEPARTMENTS[0].name
            : 'Office of the Registrar')
      );
      setAccountStatus(userToEdit.accountStatus || (userToEdit.isActive ? 'active' : 'inactive'));
    } else {
      setUsername('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setRole('student');
      setStudentNumber('');
      setFacultyId('');
      setDepartment(TECHNOLOGY_PROGRAMS[0].value);
      setAccountStatus('active');
      setPassword('');
      setShowPassword(false);
      setCopiedPassword(false);
    }
    setError('');
  }, [userToEdit, isOpen]);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setError('');
    if (newRole === 'student') {
      const derivedId = extractStudentId(email) || studentNumber;
      setStudentNumber(derivedId);
      setUsername(derivedId);
      if (derivedId) {
        setEmail(`${derivedId}@student.buksu.edu.ph`);
      }
      setDepartment(TECHNOLOGY_PROGRAMS[0].value);
    } else if (newRole === 'faculty') {
      setDepartment(FACULTY_DEPARTMENTS[0].name);
    } else if (newRole === 'admin') {
      setDepartment('Office of the Registrar');
    }
  };

  const handleStudentIdChange = (val: string) => {
    const cleanDigits = val.replace(/\D/g, '').slice(0, 10);
    setStudentNumber(cleanDigits);
    setUsername(cleanDigits);
    setEmail(cleanDigits ? `${cleanDigits}@student.buksu.edu.ph` : '');
  };

  const handleGeneratePassword = async () => {
    if (!isPasswordGenEnabled || isGeneratingPassword) return;
    setIsGeneratingPassword(true);
    setPasswordGenNotice('');
    try {
      const res = await generateApiPassword(12);
      if (res && res.password) {
        setPassword(res.password);
        setShowPassword(true);
        setCopiedPassword(false);
        setPasswordGenNotice(res.source === 'api-ninjas' ? 'API Ninjas generated' : 'Secure fallback generator');
        setTimeout(() => setPasswordGenNotice(''), 3500);
        return;
      }
    } catch (err) {
      console.warn('API password generator failed or is disabled:', err);
      setPasswordGenNotice('Password generator is disabled');
      setTimeout(() => setPasswordGenNotice(''), 3500);
    } finally {
      setIsGeneratingPassword(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch {
      // Ignore clipboard write failure
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }

    if (role === 'student') {
      const cleanStudentId = studentNumber.trim() || extractStudentId(email);
      if (!cleanStudentId || !/^\d{10}$/.test(cleanStudentId)) {
        setError('A valid 10-digit Student ID Number is required.');
        return;
      }
      const derivedEmail = email.trim() || `${cleanStudentId}@student.buksu.edu.ph`;
      if (!derivedEmail.toLowerCase().endsWith('@student.buksu.edu.ph')) {
        setError('Student institutional email must end with @student.buksu.edu.ph.');
        return;
      }
      if (!userToEdit && password.length < 8) {
        setError('Temporary password must be at least 8 characters.');
        return;
      }

      setIsSaving(true);
      try {
        if (!userToEdit) {
          await createUserAccount({
            username: cleanStudentId,
            password,
            role: 'student',
            accountStatus,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: derivedEmail,
            studentNumber: cleanStudentId,
            employeeId: '',
            department: department.trim() || TECHNOLOGY_PROGRAMS[0].value,
          });
        } else {
          await saveUserAccount(userToEdit.id, 'student', {
            username: cleanStudentId,
            role: 'student',
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: derivedEmail,
            studentNumber: cleanStudentId,
            employeeId: '',
            department: department.trim() || TECHNOLOGY_PROGRAMS[0].value,
            accountStatus,
            ...(password ? { password } : {}),
          });
        }
        onClose();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to save user.');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (role === 'faculty') {
      if (!username.trim()) {
        setError('Faculty login username is required.');
        return;
      }
      if (!email.trim() || !email.toLowerCase().endsWith('@faculty.buksu.edu.ph')) {
        setError('A valid faculty institutional email ending with @faculty.buksu.edu.ph is required.');
        return;
      }
      if (!userToEdit && password.length < 8) {
        setError('Temporary password must be at least 8 characters.');
        return;
      }

      setIsSaving(true);
      try {
        if (!userToEdit) {
          await createUserAccount({
            username: username.trim(),
            password,
            role: 'faculty',
            accountStatus,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            studentNumber: '',
            employeeId: facultyId.trim(),
            department: department.trim() || FACULTY_DEPARTMENTS[0].name,
          });
        } else {
          await saveUserAccount(userToEdit.id, 'faculty', {
            username: username.trim(),
            role: 'faculty',
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            studentNumber: '',
            employeeId: facultyId.trim(),
            department: department.trim() || FACULTY_DEPARTMENTS[0].name,
            accountStatus,
            ...(password ? { password } : {}),
          });
        }
        onClose();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to save user.');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (role === 'admin') {
      if (!username.trim()) {
        setError('Administrator username is required.');
        return;
      }
      if (!email.trim() || !email.toLowerCase().endsWith('@buksu.edu.ph')) {
        setError('A valid institutional email ending with @buksu.edu.ph is required.');
        return;
      }
      if (!userToEdit && password.length < 8) {
        setError('Temporary password must be at least 8 characters.');
        return;
      }

      setIsSaving(true);
      try {
        if (!userToEdit) {
          await createUserAccount({
            username: username.trim(),
            password,
            role: 'admin',
            accountStatus,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            studentNumber: '',
            employeeId: '',
            department: 'Office of the Registrar',
          });
        } else {
          await saveUserAccount(userToEdit.id, 'admin', {
            username: username.trim(),
            role: 'admin',
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            studentNumber: '',
            employeeId: '',
            department: 'Office of the Registrar',
            accountStatus,
            ...(password ? { password } : {}),
          });
        }
        onClose();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to save user.');
      } finally {
        setIsSaving(false);
      }
      return;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={userToEdit ? 'Update Authorized User Account' : 'Create New Authorized User Account'}
      subtitle="Configure role-based access permissions for Student, Faculty, or Administrator."
      maxWidth="xl"
      actions={
        <div className="flex w-full flex-col-reverse justify-end gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onClose}
            className="admin-secondary-button"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="admin-primary-button"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving…' : userToEdit ? 'Save Changes' : 'Create User Account'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="admin-modal-form">
        {/* Role Selection */}
        <div>
          <label className="admin-control-label">
            System Role & Access Tier <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {[
              { id: 'student' as UserRole, label: 'Student', icon: GraduationCap, badge: 'Portal Access' },
              { id: 'faculty' as UserRole, label: 'Faculty', icon: Users, badge: 'Evaluator & Officer' },
              { id: 'admin' as UserRole, label: 'Registrar Admin', icon: ShieldCheck, badge: 'Full Admin Scope' },
            ].map(({ id, label, icon: Icon, badge }) => {
              const isSelected = role === id;
              const isDisabled = Boolean(userToEdit && id !== userToEdit.role);
              return (
                <button
                  type="button"
                  key={id}
                  disabled={isDisabled}
                  onClick={() => handleRoleChange(id)}
                  aria-pressed={isSelected}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50/70 text-brand-700 ring-2 ring-brand-500/20 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Icon className={`w-5 h-5 mb-1 ${isSelected ? 'text-brand-600' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold">{label}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{badge}</span>
                </button>
              );
            })}
          </div>

          {userToEdit && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Role cannot be altered after account creation to safeguard historical records and permissions.
            </p>
          )}
        </div>

        {/* Dynamic Fields for Student */}
        {role === 'student' && (
          <div className="space-y-4 pt-2">
            {/* Student ID & Auto-Generated Preview */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-brand-600" />
                    Student ID Number (10 Digits) <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[11px] font-mono font-semibold ${
                    studentNumber.length === 10 ? 'text-emerald-600' : 'text-slate-500'
                  }`}>
                    {studentNumber.length}/10 digits
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={studentNumber}
                  onChange={(e) => handleStudentIdChange(e.target.value)}
                  disabled={Boolean(userToEdit)}
                  placeholder="e.g., 2401105814"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-blue-200 font-mono text-sm font-semibold tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              {/* Live Generated Credentials Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-white/80 p-2.5 rounded-lg border border-blue-100">
                <div className="min-w-0">
                  <span className="text-slate-500 block">Institutional Email:</span>
                  <span className="font-mono font-medium text-slate-800 truncate block">
                    {email || <span className="text-slate-400 italic">Auto-generated from ID</span>}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 block">Login Username:</span>
                  <span className="font-mono font-medium text-slate-800 truncate block">
                    {username || <span className="text-slate-400 italic">Matches Student ID</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="admin-control-label">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  placeholder="e.g., Juan"
                />
              </div>
              <div>
                <label className="admin-control-label">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  placeholder="e.g., Dela Cruz"
                />
              </div>
            </div>

            {/* Degree Program Selector */}
            <div>
              <label className="admin-control-label">
                Degree Program (College of Technologies) <span className="text-rose-500">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {TECHNOLOGY_PROGRAMS.map((prog) => (
                  <option key={prog.value} value={prog.value}>
                    {prog.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Dynamic Fields for Faculty */}
        {role === 'faculty' && (
          <div className="space-y-4 pt-2">
            {/* Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="admin-control-label">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  placeholder="e.g., Maria"
                />
              </div>
              <div>
                <label className="admin-control-label">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  placeholder="e.g., Santos"
                />
              </div>
            </div>

            {/* Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="admin-control-label">
                  Login Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  placeholder="e.g., m.santos"
                />
              </div>
              <div>
                <label className="admin-control-label">
                  Faculty / Employee ID <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value)}
                  className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  placeholder="e.g., FAC-2024-01"
                />
              </div>
            </div>

            {/* Institutional Email */}
            <div>
              <label className="admin-control-label">
                Faculty Institutional Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                placeholder="e.g., msantos@faculty.buksu.edu.ph"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Must end with <span className="font-mono text-slate-700">@faculty.buksu.edu.ph</span>
              </p>
            </div>

            {/* Department Selection */}
            <div>
              <label className="admin-control-label">
                Assigned Academic Department <span className="text-rose-500">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {FACULTY_DEPARTMENTS.map((dept) => (
                  <option key={dept.code} value={dept.name}>
                    {dept.label}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50/50 p-2.5 text-[11px] text-brand-900">
                <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                <span>
                  Authorizes this faculty member as an <strong>Academic Evaluator & Enrollment Officer</strong> for this department.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Fields for Admin */}
        {role === 'admin' && (
          <div className="space-y-4 pt-2">
            {/* Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="admin-control-label">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  placeholder="e.g., Carlos"
                />
              </div>
              <div>
                <label className="admin-control-label">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  placeholder="e.g., Mendoza"
                />
              </div>
            </div>

            {/* Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="admin-control-label">
                  Admin Username / Handle <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  placeholder="e.g., admin.sapes"
                />
              </div>
              <div>
                <label className="admin-control-label">
                  Institutional Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  placeholder="e.g., cmendoza@buksu.edu.ph"
                />
              </div>
            </div>

            {/* Scope card */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-amber-900">System-Wide Registrar Administration Scope</h5>
                <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                  This user will possess administrative authority across all College of Technologies departments, including student masterlists, academic records, account authorizations, and system audit logs.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Temporary Password Section */}
        <div className="border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between mb-1">
            <label className="admin-control-label">
              {userToEdit ? 'Reset Password' : 'Temporary Password'} {!userToEdit && <span className="text-rose-500">*</span>}
            </label>
            <button
              type="button"
              disabled={!isPasswordGenEnabled || isGeneratingPassword}
              onClick={handleGeneratePassword}
              title={!isPasswordGenEnabled ? 'Password generator is turned off in App Settings' : 'Generate Secure Password'}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:text-slate-400 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGeneratingPassword ? 'animate-spin' : ''}`} />
              <span>Generate Secure Password</span>
              {!isPasswordGenEnabled && (
                <span className="text-[10px] font-normal text-slate-400 ml-0.5">(Disabled)</span>
              )}
            </button>
          </div>
          <div className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              required={!userToEdit}
              minLength={8}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setCopiedPassword(false);
              }}
              className="w-full px-3 py-2 pr-20 font-mono text-xs rounded-lg border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder={userToEdit ? 'Leave blank to keep current password' : 'At least 8 characters (e.g. BukSU#2026!)'}
            />
            <div className="absolute right-1.5 flex items-center gap-1">
              {password && (
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  title="Copy password to clipboard"
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition cursor-pointer"
                >
                  {copiedPassword ? (
                    <span className="flex items-center text-[10px] font-bold text-emerald-600 gap-0.5">
                      <Check className="w-3.5 h-3.5" /> Copied
                    </span>
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Hide password' : 'Show password'}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-slate-500">
              {userToEdit
                ? 'Only enter a value if you wish to reset the user’s password.'
                : 'Minimum 8 characters. Share this temporary password securely with the user.'}
            </p>
            {passwordGenNotice && (
              <span className="text-[11px] font-medium text-emerald-600">
                {passwordGenNotice}
              </span>
            )}
          </div>
        </div>

        {/* Account Status */}
        {userToEdit ? (
          <div className="border-t border-slate-200 pt-3">
            <label className="admin-control-label">
              Account Status & Access Tier <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1 flex flex-wrap gap-4">
              {[
                { val: 'active' as const, label: 'Active', color: 'bg-emerald-500' },
                { val: 'inactive' as const, label: 'Inactive', color: 'bg-slate-400' },
                { val: 'suspended' as const, label: 'Suspended', color: 'bg-amber-500' },
              ].map(({ val, label, color }) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="radio"
                    name="accountStatus"
                    value={val}
                    checked={accountStatus === val}
                    onChange={() => setAccountStatus(val)}
                    className="w-4 h-4 text-brand-600"
                  />
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${color}`} /> {label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-800">
            <span className="flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Initial Account Status: <strong>Active</strong>
            </span>
            <span className="text-[11px] text-emerald-700/80">Authorized for immediate portal sign-in</span>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <p role="alert" className="admin-alert admin-alert-error">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
};
