import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, ShieldCheck } from 'lucide-react';
import { fetchRolePermissions, RolePermissionConfig, updateRolePermissions } from '../../lib/api';

const permissionLabels: Record<string, string> = {
  view_own_profile: 'View own profile',
  edit_own_profile: 'Edit own profile',
  view_own_academic_record: 'View own academic record',
  view_student_records: 'View student records',
  submit_evaluations: 'Submit evaluations',
  manage_users: 'Manage user accounts',
  manage_academic_records: 'Manage academic records',
  view_reports: 'View reports',
  view_audit_logs: 'View security audit logs',
};

const sensitivePermissions = new Set(['manage_users', 'manage_academic_records', 'view_audit_logs']);

export const RolePermissionsPanel: React.FC = () => {
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<RolePermissionConfig[]>([]);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRolePermissions()
      .then((data) => {
        setAvailablePermissions(data.availablePermissions);
        setRoles(data.roles);
      })
      .catch((error) => {
        setMessageKind('error');
        setMessage(error instanceof Error ? error.message : 'Unable to load permissions.');
      })
      .finally(() => setLoading(false));
  }, []);

  const togglePermission = (role: RolePermissionConfig['role'], permission: string) => {
    setRoles((current) => current.map((item) => {
      if (item.role !== role) return item;
      const permissions = item.permissions.includes(permission)
        ? item.permissions.filter((itemPermission) => itemPermission !== permission)
        : [...item.permissions, permission];
      return { ...item, permissions };
    }));
  };

  const saveRole = async (config: RolePermissionConfig) => {
    setSavingRole(config.role);
    setMessage('');
    try {
      const saved = await updateRolePermissions(config.role, config.permissions);
      setRoles((current) => current.map((item) => item.role === saved.role ? saved : item));
      setMessageKind('success');
      setMessage(`${config.role} permissions saved.`);
    } catch (error) {
      setMessageKind('error');
      setMessage(error instanceof Error ? error.message : 'Unable to save permissions.');
    } finally {
      setSavingRole(null);
    }
  };

  return (
    <section className="admin-page-stack" role="tabpanel">
      <div className="admin-panel admin-panel-body">
        <div className="admin-section-heading">
          <div className="flex items-start gap-3">
            <span className="admin-heading-icon"><ShieldCheck className="h-4 w-4" /></span>
          <div>
              <h2>Role-based permissions</h2>
              <p>Configure the capabilities granted to each system role. Sensitive permissions are identified for review.</p>
            </div>
          </div>
        </div>
      </div>

      {message && <p role={messageKind === 'error' ? 'alert' : 'status'} className={`admin-alert ${messageKind === 'error' ? 'admin-alert-error' : 'admin-alert-success'}`}>{message}</p>}

      {loading && <div className="admin-panel admin-loading-state">Loading role permissions...</div>}

      {!loading && <div className="admin-permission-grid">
        {roles.map((config) => (
          <section key={config.role} className="admin-permission-card" aria-labelledby={`permission-role-${config.role}`}>
            <div className="admin-permission-card-header">
              <div>
                <h3 id={`permission-role-${config.role}`} className="capitalize">{config.role === 'admin' ? 'Administrator' : config.role}</h3>
                <p className="mt-1 text-[11px] text-slate-500">{config.permissions.length} permissions enabled</p>
              </div>
              <button
                type="button"
                onClick={() => saveRole(config)}
                disabled={savingRole === config.role}
                className="admin-primary-button min-h-0 px-3 py-2"
              >
                {savingRole === config.role ? 'Saving...' : 'Save changes'}
              </button>
            </div>
            <div className="admin-permission-list">
              {availablePermissions.map((permission) => {
                const checked = config.permissions.includes(permission);
                const sensitive = sensitivePermissions.has(permission);
                return (
                  <label key={permission} className={`admin-permission-option ${sensitive ? 'is-sensitive' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePermission(config.role, permission)}
                      className="sr-only"
                    />
                    <span className={`admin-check-visual ${checked ? 'is-checked' : ''}`} aria-hidden="true">
                      {checked && <Check className="w-3 h-3" />}
                    </span>
                    <span className="flex-1">{permissionLabels[permission] || permission}</span>
                    {sensitive && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800"><AlertTriangle className="h-3 w-3" /> Sensitive</span>}
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>}
    </section>
  );
};
