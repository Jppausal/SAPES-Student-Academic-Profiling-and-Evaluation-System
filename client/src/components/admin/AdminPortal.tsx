import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserAccount, UserRole } from '../../types';
import { UserManagementModal } from './UserManagementModal';
import { BackendAcademicRecordManager } from './BackendAcademicRecordManager';
import { AdminReportsView } from './AdminReportsView';
import { SystemAuditLogsView } from './SystemAuditLogsView';
import { RolePermissionsPanel } from './RolePermissionsPanel';
import { AdminSettings } from './AdminSettings';
import './admin-ui.css';
import {
  Users,
  Settings,
  GraduationCap,
  FileCheck2,
  Activity,
  KeyRound,
  Plus,
  Edit3,
  UserX,
  UserCheck,
  Search,
  AlertTriangle,
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const {
    currentUser,
    users,
    deactivateUserAccount,
    reactivateUserAccount,
    updateUserAccountStatus,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'users' | 'permissions' | 'academic-records' | 'reports' | 'logs' | 'settings'
  >('users');

  // User Management Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserAccount | null>(null);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const [userActionError, setUserActionError] = useState('');

  // User search
  const [userSearch, setUserSearch] = useState('');
  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      !q ||
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  });

  const handleUserStatus = async (userId: string, role: UserRole, active: boolean) => {
    setStatusLoadingId(userId);
    setUserActionError('');
    try {
      if (active) {
        await deactivateUserAccount(userId, role);
      } else {
        await reactivateUserAccount(userId, role);
      }
    } catch (error) {
      setUserActionError(error instanceof Error ? error.message : 'Unable to update user status.');
    } finally {
      setStatusLoadingId(null);
    }
  };

  const handleStatusSelect = async (
    userId: string,
    role: UserRole,
    status: 'active' | 'inactive' | 'suspended'
  ) => {
    setStatusLoadingId(userId);
    setUserActionError('');
    try {
      await updateUserAccountStatus(userId, role, status);
    } catch (error) {
      setUserActionError(error instanceof Error ? error.message : 'Unable to update user status.');
    } finally {
      setStatusLoadingId(null);
    }
  };

  return (
    <div className="admin-shell space-y-5">
      {/* Top Banner */}
      <header className="admin-workspace-header">
        <div>
          <div className="admin-context-line">
            <span className="admin-context-badge">
              Registrar & System Administrator
            </span>
            <span>
              Admin: {currentUser?.fullName || 'Registrar Admin'}
            </span>
          </div>
          <h1>
            Administration
          </h1>
          <p>
            Manage student records, account access, and system configuration.
          </p>
        </div>

        {activeTab === 'users' && <div className="shrink-0">
          <button
            type="button"
            onClick={() => {
              setUserToEdit(null);
              setIsUserModalOpen(true);
            }}
            className="admin-primary-button"
          >
            <Plus className="w-4 h-4" />
            Create User Account
          </button>
        </div>}
      </header>

      <div className="admin-navigation-layout">
        <nav className="admin-sidebar" aria-label="Administration">
          {[
            { title: 'Student records', items: [{ id: 'academic-records', label: 'Academic records', icon: GraduationCap }, { id: 'reports', label: 'Reports & analytics', icon: FileCheck2 }] },
            { title: 'Access management', items: [{ id: 'users', label: 'User accounts', icon: Users }, { id: 'permissions', label: 'Roles & permissions', icon: KeyRound }] },
            { title: 'System', items: [{ id: 'settings', label: 'System settings', icon: Settings }, { id: 'logs', label: 'Audit logs', icon: Activity }] },
          ].map(group => <div className="admin-nav-group" key={group.title}>
            <p>{group.title}</p>
            {group.items.map(item => <button key={item.id} type="button" aria-current={activeTab === item.id ? 'page' : undefined} className={activeTab === item.id ? 'is-active' : ''} onClick={() => setActiveTab(item.id as typeof activeTab)}><item.icon aria-hidden="true" /><span>{item.label}</span>{item.id === 'users' && <small>{users.length}</small>}</button>)}
          </div>)}
          <p className="admin-sidebar-note">Personal password and notification preferences are in <strong>My account</strong>, under your profile menu.</p>
        </nav>
        <main className="admin-content" aria-label="Selected administration section">
      {/* TAB 1: USERS & ACCESS CONTROL */}
      {activeTab === 'settings' && <AdminSettings onAudit={() => setActiveTab('logs')} />}
      {activeTab === 'users' && (
        <div className="admin-page-stack" role="tabpanel">
          {userActionError && (
            <p role="alert" className="admin-alert admin-alert-error">
              {userActionError}
            </p>
          )}
          <section className="admin-panel admin-toolbar" aria-label="User account search">
            <div className="admin-search-control">
              <Search />
              <label htmlFor="admin-user-search" className="sr-only">Search user accounts</label>
              <input
                id="admin-user-search"
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user accounts by name, username, email, or role..."
              />
            </div>
            <span className="admin-count">
              Total Accounts: <strong className="text-slate-900">{users.length}</strong>
            </span>
          </section>

          <section className="admin-panel overflow-hidden">
            <div className="admin-table-wrap">
              <table className="admin-table" aria-label="Authorized user accounts">
                <thead>
                  <tr>
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4">Role & Access Tier</th>
                    <th className="py-3 px-4">Identifier / ID</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className={!u.isActive ? 'admin-table-row-muted' : undefined}
                    >
                      <td className="py-3 px-4">
                        <span className="admin-table-primary">{u.fullName}</span>
                        <span className="admin-table-secondary">{u.email}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`admin-badge ${
                            u.role === 'admin'
                              ? 'admin-badge-violet'
                              : u.role === 'faculty'
                              ? 'admin-badge-blue'
                              : 'admin-badge-green'
                          }`}
                        >
                          {u.role === 'admin' ? 'Registrar Admin' : u.role}
                        </span>
                      </td>

                      <td className="admin-mono font-semibold">
                        {u.studentNumber || u.facultyId || u.employeeId || 'N/A'}
                      </td>

                      <td className="py-3 px-4 text-slate-600">{u.department}</td>

                      <td className="py-3 px-4">
                        {u.accountStatus === 'suspended' ? (
                          <span className="admin-badge admin-badge-amber">
                            <AlertTriangle className="h-3 w-3 text-amber-600" /> Suspended
                          </span>
                        ) : u.isActive ? (
                          <span className="admin-badge admin-badge-green">
                            <UserCheck className="w-3 h-3 text-emerald-600" /> Active
                          </span>
                        ) : (
                          <span className="admin-badge admin-badge-red">
                            <UserX className="w-3 h-3 text-rose-600" /> Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="admin-row-actions">
                          <select
                            value={u.accountStatus || (u.isActive ? 'active' : 'inactive')}
                            onChange={(event) => handleStatusSelect(
                              u.id,
                              u.role,
                              event.target.value as 'active' | 'inactive' | 'suspended'
                            )}
                            disabled={statusLoadingId === u.id}
                            className="admin-status-control"
                            aria-label={`Status for ${u.username}`}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                          </select>
                          <button
                            onClick={() => {
                              setUserToEdit(u);
                              setIsUserModalOpen(true);
                            }}
                            className="admin-icon-button"
                            title="Edit User Information"
                            aria-label={`Edit ${u.fullName || u.username}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {u.isActive ? (
                            <button
                              onClick={() => handleUserStatus(u.id, u.role, true)}
                              disabled={statusLoadingId === u.id}
                              className="admin-danger-button min-h-0 px-2.5 py-1.5 text-[11px]"
                              title="Deactivate Account"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUserStatus(u.id, u.role, false)}
                              disabled={statusLoadingId === u.id}
                              className="admin-success-button min-h-0 px-2.5 py-1.5 text-[11px]"
                              title="Reactivate Account"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="admin-empty-state">
                        <Users />
                        <strong>No matching accounts</strong>
                        <span>Try a different name, email, username, or role.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'permissions' && <RolePermissionsPanel />}

      {/* TAB 2: ACADEMIC RECORDS & MAJOR GWA CONFIGURATION */}
      {activeTab === 'academic-records' && <BackendAcademicRecordManager />}
      {/* TAB 3: INSTITUTIONAL REPORTS */}
      {activeTab === 'reports' && <AdminReportsView />}

      {/* TAB 4: SECURITY AUDIT TRAIL */}
      {activeTab === 'logs' && <SystemAuditLogsView />}

      </main>
      </div>
      {/* MODALS */}
      {isUserModalOpen && (
        <UserManagementModal
          isOpen={isUserModalOpen}
          onClose={() => {
            setIsUserModalOpen(false);
            setUserToEdit(null);
          }}
          userToEdit={userToEdit}
        />
      )}

    </div>
  );
};
