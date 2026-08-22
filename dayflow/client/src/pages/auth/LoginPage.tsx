import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/ui';
import toast from 'react-hot-toast';
import logoImg from '../../assets/logo.png';

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

  const teamAccounts = [
    { label: 'Tharun (Admin)', email: 'tharunkumark42007@gmail.com', password: 'Admin@123', role: 'ADMIN' },
    { label: 'Sanjay (HR)', email: 'sanjayselvakumar05@gmail.com', password: '12345678', role: 'HR' },
    { label: 'Ramkishore', email: 'ramkishoresm@gmail.com', password: 'Employee@123', role: 'EMPLOYEE' },
    { label: 'Santhosh', email: 'writetokumarsanthosh@gmail.com', password: 'Employee@123', role: 'EMPLOYEE' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex font-sans">
      {/* Left side - branding (IT Task Manager Theme) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-stone-900 border-r border-stone-200/80 bg-white">
        <div className="max-w-md text-left">
          <div className="w-20 h-20 mb-6 flex items-center justify-center">
            <img src={logoImg} alt="Work Suite Logo" className="w-full h-full object-contain drop-shadow-md" />
          </div>
          <h1 className="text-4xl font-extrabold text-stone-900 mb-2 tracking-tight">Work Suite HRMS</h1>
          <p className="text-stone-500 font-semibold text-base mb-8">"Every workday, perfectly aligned."</p>

          <div className="space-y-3 text-sm">
            {[
              { title: 'HR Employee Directory', desc: 'Secure company-provisioned employee accounts with custom initial passwords' },
              { title: 'Live Attendance & Breaks', desc: 'Real-time check-in, check-out, and break duration tracker' },
              { title: 'Time Off Requests', desc: 'Multi-type time off application and streamlined HR approval workflow' },
              { title: 'Attendance-Linked Payroll', desc: 'Payable days calculated directly from verified monthly attendance logs' },
            ].map((f) => (
              <div key={f.title} className="p-3.5 rounded-2xl bg-stone-50/80 border border-stone-200/70 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-stone-800 text-xs uppercase tracking-wider">{f.title}</p>
                  <p className="text-stone-500 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
            <div className="w-14 h-14 flex items-center justify-center">
              <img src={logoImg} alt="Work Suite Logo" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            <div>
              <h1 className="text-lg font-black text-stone-900">Work Suite</h1>
              <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">HRMS Platform</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/50 p-8 border border-stone-200/90">
            <h2 className="text-2xl font-black text-stone-900 mb-1 tracking-tight">Sign in</h2>
            <p className="text-stone-500 text-xs font-medium mb-6">Enter your credentials to access your Work Suite workspace</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="login-email"
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@company.com"
                leftIcon={<Mail className="w-4 h-4 text-stone-400" />}
                required
              />
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-[11px] font-bold text-stone-500 hover:text-black transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-stone-200 px-3.5 py-2 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl">
                  <p className="text-xs text-rose-600 font-semibold">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full py-2.5 shadow-xs"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </form>

            {/* Sign Up prompt */}
            <div className="mt-5 pt-4 border-t border-stone-100 text-center">
              <p className="text-xs text-stone-500 font-medium">
                Don't have an account?{' '}
                <Link to="/register" className="font-bold text-stone-900 hover:underline">
                  Sign Up
                </Link>
              </p>
            </div>

            {/* Team One-Click Login */}
            <div className="mt-4 pt-4 border-t border-stone-100">
              <p className="text-[11px] text-stone-400 mb-2.5 text-center font-bold uppercase tracking-wider">Quick Team Member Login</p>
              <div className="grid grid-cols-2 gap-2">
                {teamAccounts.map((acc) => (
                  <button
                    key={acc.label}
                    onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                    className="text-xs py-2 px-2.5 border border-stone-200 rounded-xl text-stone-700 hover:bg-stone-100/80 hover:border-stone-300 hover:text-black transition-all font-semibold text-left truncate bg-stone-50/50"
                  >
                    <p className="font-bold text-stone-900 truncate text-[11px]">{acc.label}</p>
                    <p className="text-[10px] text-stone-400 font-mono truncate">{acc.email.split('@')[0]}</p>
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
