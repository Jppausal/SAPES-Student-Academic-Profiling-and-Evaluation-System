import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserAccount, UserRole } from '../../types';
import { Modal } from '../common/Modal';
import { Save } from 'lucide-react';

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
      setStudentNumber('');
      setFacultyId('');
      setDepartment('College of Computer Studies');
      setIsActive(true);
      setPassword('');
    }
    setError('');
  }, [userToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const derivedStudentId = role === 'student' ? extractStudentId(email) : '';
    if (!firstName.trim() || !lastName.trim() || !email.trim() || (role === 'student' && !derivedStudentId) || (role !== 'student' && !username.trim()) || (!userToEdit && password.length < 8)) {
      if (role === 'student' && !derivedStudentId) {
        setError('Use the student institutional email format: studentID@student.buksu.edu.ph.');
        return;
      }
      setError('First name, last name, and the required account identifier must be provided.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      if (!userToEdit) {
        await createUserAccount({ username: role === 'student' ? derivedStudentId : username, password, role, accountStatus: isActive ? 'active' : 'inactive', firstName, lastName, email, studentNumber: role === 'student' ? derivedStudentId : '', employeeId: facultyId, department });
      } else {
        await saveUserAccount(userToEdit.id, {
          username: role === 'student' ? derivedStudentId : username,
          role,
          firstName,
          lastName,
          email,
          studentNumber: role === 'student' ? derivedStudentId : '',
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
            {isSaving ? 'Savingâ€¦' : userToEdit ? 'Save Changes' : 'Create User Account'}
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
          <div className="admin-role-selector">
            {(['student', 'faculty', 'admin'] as UserRole[]).map((r) => (
              <button
                type="button"
                key={r}
                disabled={Boolean(
                  userToEdit &&
                  r !== userToEdit.role &&
                  (r === 'student' || userToEdit.role === 'student')
                )}
                onClick={() => {
                  setRole(r);
                  if (r === 'student') {
                    const derivedId = extractStudentId(email);
                    setStudentNumber(derivedId);
                    setUsername(derivedId);
                  }
                }}
                aria-pressed={role === r}
                className={`admin-role-option ${role === r ? 'is-active' : ''}`}
              >
                {r === 'admin' ? 'Registrar Admin' : r}
              </button>
            ))}
          </div>

          {userToEdit?.role === 'student' && (
            <p className="mt-1.5 text-[11px] text-slate-500">
              Student roles and institution IDs are fixed after account creation to protect the linked academic profile.
            </p>
          )}

        </div>

        <div className="admin-form-grid border-t border-slate-200 pt-4">
          <div>
            <label className="admin-control-label">
              First Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2"
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
              className="w-full px-3 py-2"
              placeholder="e.g., Santos"
            />
          </div>

          <div>
            <label className="admin-control-label">
              Username / Login Handle <span className="text-rose-500">*</span>
            </label>
              <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
                disabled={role === 'student'}
              className="admin-mono w-full px-3 py-2"
                placeholder={role === 'student' ? 'Matches student number' : 'e.g., m.santos'}
            />
          </div>
        </div>

        <div className="admin-form-grid">
          <div>
            <label className="admin-control-label">
              Institutional Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                const nextEmail = e.target.value;
                setEmail(nextEmail);
                if (role === 'student') {
                  const derivedId = extractStudentId(nextEmail);
                  setStudentNumber(derivedId);
                  setUsername(derivedId);
                }
              }}
              className="w-full px-3 py-2"
              placeholder={role === 'student' ? '2401105814@student.buksu.edu.ph' : 'user@buksu.edu.ph'}
            />
            {role === 'student' && (
              <p className="mt-1 text-[11px] text-slate-500">
                The student ID is automatically extracted from this email.
              </p>
            )}
          </div>

          <div>
            <label className="admin-control-label">
              {role === 'student' ? 'Institution Account / Student Number' : 'Faculty / Employee ID'}
            </label>
            <input
              type="text"
              value={role === 'student' ? studentNumber : facultyId}
              disabled={role === 'student'}
              onChange={(e) => {
                if (role === 'student') {
                  setStudentNumber(e.target.value);
                  setUsername(e.target.value);
                } else {
                  setFacultyId(e.target.value);
                }
              }}
              className="admin-mono w-full bg-slate-50 px-3 py-2 disabled:text-slate-500"
              placeholder={role === 'student' ? 'Derived from institutional email' : 'FAC-XXXX'}
            />
          </div>
        </div>

        <div>
          <label className="admin-control-label">
            Department / Academic Unit
          </label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full px-3 py-2"
          />
        </div>

        {!userToEdit && (
          <div>
            <label className="admin-control-label">
              Temporary Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2"
              placeholder="At least 8 characters"
            />
          </div>
        )}

        {error && (
          <p role="alert" className="admin-alert admin-alert-error">
            {error}
          </p>
        )}

        {/* Account Active Toggle (Deactivation Requirement) */}
        <div className="admin-account-toggle">
          <label className="cursor-pointer">
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
