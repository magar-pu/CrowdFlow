import React from 'react';
import { User, Shield, Info } from 'lucide-react';

interface SettingsViewProps {
  adminName: string;
  setAdminName: (name: string) => void;
  adminRole: string;
  setAdminRole: (role: string) => void;
}

export default function SettingsView({
  adminName,
  setAdminName,
  adminRole,
  setAdminRole,
}: SettingsViewProps) {
  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Portal Settings</h1>
        <p className="text-sm text-text-secondary">Configure your organizer credentials and system properties.</p>
      </div>

      <div className="bg-white border border-border-subtle rounded-xl p-6 soft-shadow max-w-xl space-y-6">
        <h3 className="text-sm font-bold text-text-primary border-b border-border-subtle pb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-secondary" />
          Profile Configuration
        </h3>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Administrator Name</label>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white focus:border-outline outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">System Role</label>
            <input
              type="text"
              value={adminRole}
              onChange={(e) => setAdminRole(e.target.value)}
              className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white focus:border-outline outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-border-subtle rounded-xl p-6 soft-shadow max-w-xl space-y-4">
        <h3 className="text-sm font-bold text-text-primary border-b border-border-subtle pb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-secondary" />
          Security Credentials
        </h3>
        <p className="text-xs text-text-secondary leading-normal flex items-start gap-2">
          <Info className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
          This portal uses OAuth 2.0 and Turnstile captcha validation parameters on the live backend endpoint.
        </p>
      </div>
    </div>
  );
}
