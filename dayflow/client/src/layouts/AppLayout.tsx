import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { TopNav } from '../components/common/TopNav';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/profile': 'My Profile',
  '/employees': 'Employees Directory',
  '/attendance': 'Attendance & Break Tracking',
  '/leave': 'Time Off Management',
  '/payroll': 'Payroll & Compensation',
  '/notifications': 'Notifications Center',
  '/analytics': 'HR Analytics & Trends',
  '/reports': 'Company Reports',
};

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'Work Suite HRMS';

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F4] relative font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopNav title={title} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
