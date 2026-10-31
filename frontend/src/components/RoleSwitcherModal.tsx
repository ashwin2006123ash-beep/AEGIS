import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserCheck, 
  ShieldAlert, 
  Building2, 
  CheckCircle2, 
  LogIn, 
  KeyRound,
  Lock,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import type { DemoUser, UserProfile } from '../types';

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLoginSuccess: (user: UserProfile) => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
}) => {
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Manual form state
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setError(null);
      api.getDemoUsers()
        .then((users) => setDemoUsers(users))
        .catch((err) => {
          console.error('Failed to load demo accounts', err);
          setError('Failed to fetch demo accounts list.');
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectDemoUser = async (demo: DemoUser) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(demo.username, demo.password);
      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide both username and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(username, password);
      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Identity & Access Switcher
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Role-Based Security
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Switch instantly between Central Public Health Command and Edge Client Organizations.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Active Persona Banner */}
          {currentUser && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-mono">Current Session</span>
                <div className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <span>{currentUser.full_name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                    currentUser.role === 'admin' 
                      ? 'bg-indigo-950 text-indigo-300 border border-indigo-700' 
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  }`}>
                    {currentUser.role}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {currentUser.organization_name || 'District Public Health Authority'} • {currentUser.location_name || 'All Locations'}
                </div>
              </div>
              <div className="text-emerald-400 flex items-center gap-1 text-xs font-mono">
                <CheckCircle2 className="w-4 h-4" /> Active
              </div>
            </div>
          )}

          {/* Tabs: Demo Quick Switch vs Custom Login */}
          <div className="flex border-b border-slate-800 text-xs font-medium">
            <button
              onClick={() => setManualMode(false)}
              className={`pb-2.5 px-3 border-b-2 transition-all ${
                !manualMode 
                  ? 'border-indigo-500 text-indigo-300 font-bold' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Demo Accounts Quick Switch ({demoUsers.length})
            </button>
            <button
              onClick={() => setManualMode(true)}
              className={`pb-2.5 px-3 border-b-2 transition-all ${
                manualMode 
                  ? 'border-indigo-500 text-indigo-300 font-bold' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Custom Credentials Login
            </button>
          </div>

          {!manualMode ? (
            <div className="space-y-2.5">
              {demoUsers.map((user) => {
                const isActive = currentUser?.username === user.username;
                const isAdmin = user.role === 'admin';

                return (
                  <div
                    key={user.username}
                    onClick={() => !loading && handleSelectDemoUser(user)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isActive
                        ? 'bg-slate-950 border-indigo-500 ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg mt-0.5 border ${
                          isAdmin 
                            ? 'bg-indigo-950/70 border-indigo-800/80 text-indigo-300' 
                            : 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300'
                        }`}>
                          {isAdmin ? <ShieldAlert className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-200">{user.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
                              isAdmin 
                                ? 'bg-indigo-900/60 text-indigo-300' 
                                : 'bg-emerald-900/60 text-emerald-300'
                            }`}>
                              {user.role}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 font-medium">@{user.username}</span>
                          </div>
                          <p className="text-xs text-slate-300 font-medium mt-0.5">
                            {user.organization} • <span className="text-slate-400">{user.location}</span>
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            {user.description}
                          </p>
                        </div>
                      </div>

                      <button
                        disabled={loading}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 cursor-default'
                            : 'bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white'
                        }`}
                      >
                        {isActive ? 'Current' : 'Select'}
                        {!isActive && <ArrowRight className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin or pharm_sathy"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-lg border border-slate-800 font-mono">
                <span className="font-semibold text-slate-300">Demo Passwords:</span> AdminPass123! (for admin) • ClientPass123! (for client accounts)
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            JWT HMAC-SHA256 Token Authentication
          </span>
          <span>Tenant isolation enforced at API boundary</span>
        </div>
      </div>
    </div>
  );
};

