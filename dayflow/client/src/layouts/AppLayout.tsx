import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { TopNav } from '../components/common/TopNav';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/profile': 'My Profile',
  '/employees': 'Employees',
  '/attendance': 'Attendance',
  '/leave': 'Leave Management',
  '/payroll': 'Payroll',
  '/notifications': 'Notifications',
  '/analytics': 'Analytics',
  '/reports': 'Reports',
};

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'Dayflow HRMS';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 relative">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
