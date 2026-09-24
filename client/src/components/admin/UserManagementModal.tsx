import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserAccount, UserRole } from '../../types';
import { Modal } from '../common/Modal';
import { ShieldCheck, User, Mail, Building2, Save } from 'lucide-react';

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
  const [department, setDepartment] = useState('College of Computer Studies');
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setUsername(userToEdit.role === 'student' ? (userToEdit.studentNumber || userToEdit.username) : userToEdit.username);
      setFirstName(userToEdit.firstName || userToEdit.fullName.split(' ')[0] || '');
      setLastName(userToEdit.lastName || userToEdit.fullName.split(' ').slice(1).join(' '));
      setEmail(userToEdit.email);
      setRole(userToEdit.role);
      setStudentNumber(userToEdit.studentNumber || '');
      setFacultyId(userToEdit.facultyId || userToEdit.employeeId || '');
      setDepartment(userToEdit.department);
      setIsActive(userToEdit.isActive);
    } else {
      // Default new user state
      setUsername('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setRole('student');
      setStudentNumber(`2026-${Math.floor(10000 + Math.random() * 90000)}`);
      setFacultyId('');
      setDepartment('College of Computer Studies');
      setIsActive(true);
      setPassword('');
    }
    setError('');
  }, [userToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || (role === 'student' && !studentNumber.trim()) || (role !== 'student' && !username.trim()) || (!userToEdit && password.length < 8)) {
      setError('First name, last name, and the required account identifier must be provided.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      if (!userToEdit) {
        await createUserAccount({ username: role === 'student' ? studentNumber : username, password, role, firstName, lastName, email, studentNumber, employeeId: facultyId, department });
      } else {
        await saveUserAccount(userToEdit.id, {
          username: role === 'student' ? studentNumber : username,
          role,
          firstName,
          lastName,
          email,
          studentNumber,
          employeeId: facultyId,
          department,
          accountStatus: isActive ? 'active' : 'inactive',
          ...(password ? { password } : {}),
        });
      }
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save user.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={userToEdit ? 'Update Authorized User Account' : 'Create New Authorized User Account'}
      subtitle="Configure role-based access permissions for Student, Faculty, or Administrator."
      maxWidth="lg"
      actions={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving…' : userToEdit ? 'Save Changes' : 'Create User Account'}
          </button>
        </div>

      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Role Selection */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">
            System Role & Access Tier <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['student', 'faculty', 'admin'] as UserRole[]).map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => {
                  setRole(r);
                  if (r === 'student') setUsername(studentNumber);
                }}
                className={`py-2 px-3 rounded-xl border font-bold capitalize transition-all ${
                  role === r
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {r === 'admin' ? 'Registrar Admin' : r}
              </button>
            ))}
          </div>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              First Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              placeholder="e.g., Maria"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Last Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              placeholder="e.g., Santos"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Username / Login Handle <span className="text-rose-500">*</span>
            </label>
              <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
                disabled={role === 'student'}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-mono"
                placeholder={role === 'student' ? 'Matches student number' : 'e.g., m.santos'}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Institutional Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              placeholder="user@university.edu.ph"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {role === 'student' ? 'Institution Account / Student Number' : 'Faculty / Employee ID'}
            </label>
            <input
              type="text"
              value={role === 'student' ? studentNumber : facultyId}
              onChange={(e) => {
                if (role === 'student') {
                  setStudentNumber(e.target.value);
                  setUsername(e.target.value);
                } else {
                  setFacultyId(e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-mono"
              placeholder={role === 'student' ? '2023-XXXXX' : 'FAC-XXXX'}
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Department / Academic Unit
          </label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
          />
        </div>

        {!userToEdit && (
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Temporary Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              placeholder="At least 8 characters"
            />
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        {/* Account Active Toggle (Deactivation Requirement) */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span>Account Active & Authorized for Login</span>
          </label>
          <p className="text-[11px] text-slate-500 pl-6 mt-0.5">
            Unchecking will immediately deactivate user access to the system.
          </p>
        </div>
      </form>
    </Modal>
  );
};
