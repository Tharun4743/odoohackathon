import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/ui';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { label: 'Admin', email: 'admin@dayflow.com', password: 'Admin@123' },
    { label: 'HR Officer', email: 'hr@dayflow.com', password: 'Hr@123' },
    { label: 'Employee', email: 'employee@dayflow.com', password: 'Employee@123' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-white">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-9 h-9" />
          </div>
          <h1 className="text-4xl font-bold mb-3">Dayflow HRMS</h1>
          <p className="text-slate-300 text-lg mb-8">"Every workday, perfectly aligned."</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Employee Directory', desc: 'HR-provisioned accounts' },
              { label: 'Live Attendance', desc: 'Check-in, breaks & tracking' },
              { label: 'Time Off Requests', desc: 'Multi-type approval flow' },
              { label: 'Attendance Payroll', desc: 'Calculated from actual attendance' },
            ].map((f) => (
              <div key={f.label} className="bg-white/10 rounded-xl p-4 text-left">
                <p className="font-semibold mb-1">{f.label}</p>
                <p className="text-slate-300 text-xs">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Dayflow</h1>
              <p className="text-xs text-slate-400">HRMS</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-1">Sign in</h2>
            <p className="text-slate-500 text-sm mb-6">Access your Dayflow HRMS workspace</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="login-email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@dayflow.com"
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />
              <div className="flex flex-col gap-1">
                <label htmlFor="login-password" className="text-sm font-medium text-slate-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </form>

            {/* Registration note */}
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2 text-xs text-slate-600">
              <ShieldAlert className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <span>Self-registration is disabled. Employee accounts are created by HR. Contact your HR admin if you need credentials.</span>
            </div>

            {/* Demo accounts */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-2 text-center font-medium">Quick Demo Login</p>
              <div className="flex gap-2">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.label}
                    onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                    className="flex-1 text-xs py-1.5 px-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
