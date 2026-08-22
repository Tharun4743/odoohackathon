import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Clock, Calendar, DollarSign, Bell,
  BarChart3, FileText, ChevronLeft, ChevronRight, LogOut,
  User, Building2
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, to: '/dashboard' },
  { label: 'Profile', icon: <User className="w-5 h-5" />, to: '/profile', roles: ['EMPLOYEE'] },
  { label: 'Employees', icon: <Users className="w-5 h-5" />, to: '/employees', roles: ['HR', 'ADMIN'] },
  { label: 'Attendance', icon: <Clock className="w-5 h-5" />, to: '/attendance' },
  { label: 'Time Off', icon: <Calendar className="w-5 h-5" />, to: '/leave' },
  { label: 'Payroll', icon: <DollarSign className="w-5 h-5" />, to: '/payroll' },
  { label: 'Notifications', icon: <Bell className="w-5 h-5" />, to: '/notifications' },
  { label: 'Analytics', icon: <BarChart3 className="w-5 h-5" />, to: '/analytics', roles: ['HR', 'ADMIN'] },
  { label: 'Reports', icon: <FileText className="w-5 h-5" />, to: '/reports', roles: ['HR', 'ADMIN'] },
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
      'flex flex-col h-screen bg-slate-900 text-white transition-all duration-300 flex-shrink-0',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight">Dayflow</h1>
            <p className="text-xs text-slate-400 truncate">HRMS</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group',
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )}
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-slate-700/50 p-3 space-y-1">
        {!collapsed && user && (
          <div className="px-2 py-2 mb-1">
            <p className="text-xs font-medium text-white truncate">
              {user.first_name || user.email}
            </p>
            <p className="text-xs text-slate-400 truncate">{user.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-colors"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && 'Logout'}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 hover:bg-slate-600 transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
};
