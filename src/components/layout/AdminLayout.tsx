import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col antialiased">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isAdminPortal={true}
      />

      <div className="flex-1 flex flex-col lg:ms-64 min-w-0 transition-all duration-200">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          isAdminPortal={true}
        />

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
