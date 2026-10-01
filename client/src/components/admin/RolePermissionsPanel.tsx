import React, { useEffect, useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { fetchRolePermissions, RolePermissionConfig, updateRolePermissions } from '../../lib/api';

const permissionLabels: Record<string, string> = {
  view_own_profile: 'View own profile',
  view_own_academic_record: 'View own academic record',
  view_student_records: 'View student records',
  submit_evaluations: 'Submit evaluations',
  manage_users: 'Manage user accounts',
  manage_academic_records: 'Manage academic records',
  view_reports: 'View reports',
  view_audit_logs: 'View security audit logs',
};

export const RolePermissionsPanel: React.FC = () => {
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<RolePermissionConfig[]>([]);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchRolePermissions()
      .then((data) => {
        setAvailablePermissions(data.availablePermissions);
        setRoles(data.roles);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load permissions.'));
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
      setMessage(`${config.role} permissions saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save permissions.');
    } finally {
      setSavingRole(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-600 mt-0.5" />
          <div>
            <h2 className="font-extrabold text-slate-900">Role-based permissions</h2>
            <p className="text-xs text-slate-500 mt-1">Configure the capabilities granted to each system role.</p>
          </div>
        </div>
      </div>

      {message && <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700">{message}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {roles.map((config) => (
          <div key={config.role} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900 capitalize">{config.role === 'admin' ? 'Administrator' : config.role}</h3>
              <button
                type="button"
                onClick={() => saveRole(config)}
                disabled={savingRole === config.role}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-50"
              >
                {savingRole === config.role ? 'Saving...' : 'Save'}
              </button>
            </div>
            <div className="space-y-2">
              {availablePermissions.map((permission) => {
                const checked = config.permissions.includes(permission);
                return (
                  <label key={permission} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePermission(config.role, permission)}
                      className="sr-only"
                    />
                    <span className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                      {checked && <Check className="w-3 h-3" />}
                    </span>
                    {permissionLabels[permission] || permission}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
