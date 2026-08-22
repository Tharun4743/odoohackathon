import React, { useState, useEffect, useRef } from 'react';
import { Bell, ChevronDown, User, Lock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { authService } from '../../services/authService';
import { Modal } from '../ui/Modal';
import { Button, Input } from '../ui';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

export const TopNav: React.FC<{ title?: string }> = ({ title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Change password modal
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await notificationService.getUnreadCount();
        setUnreadCount(count);
      } catch { /* ignore */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Please enter both current and new passwords.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    setIsChangingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully!');
      setChangePasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to change password.';
      toast.error(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const fullName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`
    : user?.email || 'User';

  const initials = user?.first_name
    ? `${user.first_name[0]}${user.last_name?.[0] || ''}`.toUpperCase()
    : (user?.email?.[0] || 'U').toUpperCase();

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-stone-200/90 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-30">
      <div>
        {title && <h2 className="text-base font-extrabold text-stone-900 tracking-tight">{title}</h2>}
      </div>
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          id="notifications-btn"
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User avatar dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="user-menu-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl border border-stone-200/80 bg-stone-50/50 hover:bg-stone-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-black"
          >
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden shadow-xs">
              {user?.profile_image
                ? <img src={user.profile_image} alt="" className="w-full h-full object-cover rounded-full" />
                : initials
              }
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-stone-900 leading-tight truncate">{fullName}</p>
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">{user?.role}</p>
            </div>
            <ChevronDown className={clsx('w-3.5 h-3.5 text-stone-400 transition-transform', dropdownOpen && 'rotate-180')} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl border border-stone-200 shadow-xl z-50 animate-fadeIn overflow-hidden">
              <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
                <p className="text-xs font-bold text-stone-900 truncate">{fullName}</p>
                <p className="text-[11px] text-stone-500 font-mono truncate mt-0.5">{user?.email}</p>
                <span className="inline-block mt-1.5 text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded-full">
                  {user?.role}
                </span>
              </div>
              <div className="p-1.5 space-y-0.5">
                <button
                  id="dropdown-profile-btn"
                  onClick={() => { navigate('/profile'); setDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 rounded-xl hover:bg-stone-100 transition-colors text-left"
                >
                  <User className="w-4 h-4 text-stone-400" />
                  My Profile
                </button>
                <button
                  id="dropdown-change-password-btn"
                  onClick={() => { setChangePasswordModal(true); setDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 rounded-xl hover:bg-stone-100 transition-colors text-left"
                >
                  <Lock className="w-4 h-4 text-stone-400" />
                  Change Password
                </button>
                <div className="my-1 border-t border-stone-100" />
                <button
                  id="dropdown-logout-btn"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 rounded-xl hover:bg-rose-50 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={changePasswordModal}
        onClose={() => setChangePasswordModal(false)}
        title="Change Password"
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setChangePasswordModal(false)}>Cancel</Button>
            <Button
              id="confirm-change-password-btn"
              size="sm"
              isLoading={isChangingPassword}
              onClick={handleChangePassword}
            >
              Update Password
            </Button>
          </>
        }
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            id="current-password"
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            required
          />
          <Input
            id="new-password"
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
          />
          <Input
            id="confirm-new-password"
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            required
          />
        </form>
      </Modal>
    </header>
  );
};
