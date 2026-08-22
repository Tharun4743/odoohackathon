import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, BadgeCheck, ShieldCheck, CheckCircle2, User, KeyRound } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { authService } from '../../services/authService';
import logoImg from '../../assets/logo.png';
import toast from 'react-hot-toast';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'verify'>('form');

  // Form State
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'EMPLOYEE' | 'HR'>('EMPLOYEE');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Send Verification OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmpId = employeeId.trim();
    const cleanEmail = email.trim();

    if (!cleanEmpId || !cleanEmail || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.sendRegisterOtp({
        employee_id: cleanEmpId,
        email: cleanEmail,
        role,
      });
      toast.success(res.message || 'Verification code sent to your email!');
      setStep('verify');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send verification code.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP & Create Account
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.trim().length < 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.verifyRegisterOtp({
        employee_id: employeeId.trim(),
        email: email.trim(),
        password,
        role,
        otp: otp.trim(),
      });
      toast.success(res.message || 'Account created successfully!');
      navigate('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Verification failed.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex font-sans">
      {/* Left side - branding & flowchart guidance */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-stone-900 border-r border-stone-200/80 bg-white">
        <div className="max-w-md text-left">
          <div className="w-24 h-24 rounded-full bg-white border-2 border-stone-200 shadow-md flex items-center justify-center p-1 mb-6 overflow-hidden">
            <img src={logoImg} alt="Work Suite Logo" className="w-full h-full object-contain rounded-full scale-105" />
          </div>
          <h1 className="text-4xl font-extrabold text-stone-900 mb-2 tracking-tight">Work Suite HRMS</h1>
          <p className="text-stone-500 font-semibold text-base mb-8">"Every workday, perfectly aligned."</p>

          <div className="space-y-3 text-sm">
            {[
              { title: '1. Enter Employee ID & Email', desc: 'Provide your assigned ID and official work email address' },
              { title: '2. Create Secure Password', desc: 'Set up an 8+ character password for your workspace' },
              { title: '3. Choose Workspace Role', desc: 'Select Employee or HR Specialist access level' },
              { title: '4. 2-Step Email Verification', desc: 'Confirm your account with a secure 6-digit Brevo OTP' },
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

      {/* Right side - registration form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          {/* Logo on mobile */}
          <div className="lg:hidden flex items-center gap-3.5 mb-6 justify-center">
            <div className="w-16 h-16 rounded-full bg-white border-2 border-stone-200 p-1 flex items-center justify-center shadow-sm overflow-hidden">
              <img src={logoImg} alt="Work Suite Logo" className="w-full h-full object-contain rounded-full scale-105" />
            </div>
            <div>
              <h1 className="text-lg font-black text-stone-900">Work Suite</h1>
              <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">HRMS Platform</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/50 p-8 border border-stone-200/90">
            {step === 'form' ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-2xl font-black text-stone-900 tracking-tight">Create Account</h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md border border-stone-200">
                    Step 1 of 2
                  </span>
                </div>
                <p className="text-stone-500 text-xs font-medium mb-6">Enter your details to join your Work Suite workspace</p>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <Input
                    id="register-employee-id"
                    label="Employee ID"
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                    placeholder="e.g. EMP-105"
                    leftIcon={<BadgeCheck className="w-4 h-4 text-stone-400" />}
                    required
                  />

                  <Input
                    id="register-email"
                    label="Work Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.name@company.com"
                    leftIcon={<Mail className="w-4 h-4 text-stone-400" />}
                    required
                  />

                  {/* Role Selector */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Role Selection <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole('EMPLOYEE')}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          role === 'EMPLOYEE'
                            ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <User className="w-4 h-4" />
                        Employee
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('HR')}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          role === 'HR'
                            ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        HR Specialist
                      </button>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="register-password" className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Create Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="w-full pl-10 pr-10 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="register-confirm-password" className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Confirm Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="register-confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-10 pr-10 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                        required
                      />
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
                    Continue to Email Verification
                  </Button>
                </form>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-900 border border-stone-200 flex items-center justify-center mx-auto mb-4 shadow-xs">
                  <KeyRound className="w-7 h-7" />
                </div>

                <h2 className="text-2xl font-black text-stone-900 mb-1 tracking-tight text-center">Verify Email</h2>
                <p className="text-stone-500 text-xs font-medium mb-6 text-center">
                  A 6-digit verification code was sent to <strong className="text-stone-900">{email}</strong>. Enter it below to activate your account.
                </p>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="register-otp" className="text-xs font-bold text-stone-700 uppercase tracking-wider text-center">
                      6-Digit Verification Code
                    </label>
                    <input
                      id="register-otp"
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-full py-3 text-center text-2xl font-black tracking-[8px] bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                      required
                    />
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
                    rightIcon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Verify & Create Account
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setStep('form'); setError(''); }}
                    className="w-full py-2 text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Edit Details
                  </button>
                </form>
              </>
            )}

            {/* Bottom link to Sign In */}
            <div className="mt-6 pt-4 border-t border-stone-100 text-center">
              <p className="text-xs text-stone-500 font-medium">
                Already registered?{' '}
                <Link to="/login" className="font-bold text-stone-900 hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
