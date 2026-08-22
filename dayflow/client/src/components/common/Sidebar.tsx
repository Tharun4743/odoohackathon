/** Time Off / Leave Management Module - Person 3 */
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Clock, Calendar, DollarSign, Bell,
  BarChart3, FileText, ChevronLeft, ChevronRight, LogOut,
  User
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

import logoImg from '../../assets/logo.png';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, to: '/dashboard' },
  { label: 'Profile', icon: <User className="w-4 h-4" />, to: '/profile', roles: ['EMPLOYEE'] },
  { label: 'Employees', icon: <Users className="w-4 h-4" />, to: '/employees', roles: ['HR', 'ADMIN'] },
  { label: 'Attendance', icon: <Clock className="w-4 h-4" />, to: '/attendance' },
  { label: 'Time Off', icon: <Calendar className="w-4 h-4" />, to: '/leave' },
  { label: 'Payroll', icon: <DollarSign className="w-4 h-4" />, to: '/payroll' },
  { label: 'Notifications', icon: <Bell className="w-4 h-4" />, to: '/notifications' },
  { label: 'Analytics', icon: <BarChart3 className="w-4 h-4" />, to: '/analytics', roles: ['HR', 'ADMIN'] },
  { label: 'Reports', icon: <FileText className="w-4 h-4" />, to: '/reports', roles: ['HR', 'ADMIN'] },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role || '');
  });

  return (
    <aside className={clsx(
      'flex flex-col h-screen bg-white text-stone-700 border-r border-stone-200/90 transition-all duration-300 flex-shrink-0 z-20 relative',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4.5 border-b border-stone-200/80">
        <div className="w-9 h-9 rounded-full bg-white border border-stone-200 shadow-xs flex items-center justify-center p-0.5 overflow-hidden flex-shrink-0">
          <img src={logoImg} alt="Work Suite Logo" className="w-full h-full object-contain rounded-full" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex items-center justify-between flex-1">
            <div>
              <h1 className="font-extrabold text-stone-900 text-sm leading-tight tracking-tight">Work Suite</h1>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">HRMS</p>
            </div>
            <span className="text-[10px] font-bold bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-md border border-stone-200">
              v1.0
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-1">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group',
              isActive
                ? 'bg-black text-white shadow-xs'
                : 'text-stone-600 hover:text-black hover:bg-stone-100/90'
            )}
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate tracking-tight">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-stone-200/80 p-3 bg-stone-50/60 space-y-1">
        {!collapsed && user && (
          <div className="px-2 py-1 mb-1">
            <p className="text-xs font-bold text-stone-900 truncate">
              {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.email}
            </p>
            <span className="inline-block text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded-full mt-1">
              {user.role}
            </span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && 'Sign Out'}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-white border border-stone-200 shadow-xs flex items-center justify-center text-stone-500 hover:text-black hover:bg-stone-50 transition-colors z-30"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
};
