import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { authService } from '../../services/authService';
import { Button, Input } from '../../components/ui';
import logoImg from '../../assets/logo.png';
import toast from 'react-hot-toast';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await authService.forgotPassword(email);
      toast.success(res.message || 'Verification code sent to your email!');
      setStep('verify');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send verification code.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otp || otp.length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.resetPassword(email, otp, newPassword);
      toast.success(res.message || 'Password reset successfully!');
      navigate('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to reset password.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center p-8 font-sans">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3.5 mb-8 justify-center">
          <div className="w-16 h-16 rounded-full bg-white border-2 border-stone-200 p-1 flex items-center justify-center shadow-sm overflow-hidden">
            <img src={logoImg} alt="Work Suite Logo" className="w-full h-full object-contain rounded-full scale-105" />
          </div>
          <div>
            <h1 className="text-lg font-black text-stone-900 tracking-tight">Work Suite</h1>
            <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">HRMS Platform</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/50 p-8 border border-stone-200/90">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-900 border border-stone-200 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <KeyRound className="w-7 h-7" />
          </div>

          <h2 className="text-2xl font-black text-stone-900 mb-1 tracking-tight text-center">
            {step === 'request' ? 'Reset Password' : 'Enter Verification Code'}
          </h2>
          <p className="text-stone-500 text-xs font-medium mb-6 text-center">
            {step === 'request'
              ? 'Enter your work email address and we will send you a 6-digit verification code.'
              : `A 6-digit code was sent to ${email}. Check your inbox.`}
          </p>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl mb-4">
              <p className="text-xs text-rose-600 font-semibold">{error}</p>
            </div>
          )}

          {step === 'request' ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <Input
                id="reset-email"
                label="Registered Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@company.com"
                leftIcon={<Mail className="w-4 h-4 text-stone-400" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full py-2.5 shadow-xs"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Send Verification Code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="otp-input" className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  6-Digit Verification Code <span className="text-rose-500">*</span>
                </label>
                <input
                  id="otp-input"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center text-2xl font-black tracking-widest rounded-xl border border-stone-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-stone-50 font-mono"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-password-input" className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="new-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
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

              <Input
                id="confirm-password-input"
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                leftIcon={<Lock className="w-4 h-4 text-stone-400" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full py-2.5 shadow-xs"
                isLoading={isLoading}
                rightIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Reset Password
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-xs font-semibold text-stone-500 hover:text-black transition-colors"
                >
                  Didn't receive a code? Try again
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-stone-100 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-black transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
