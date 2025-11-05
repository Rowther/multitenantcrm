import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Building2, LogOut, Menu, X, Users, FileText, Truck, Wrench, Bell } from 'lucide-react';

const DashboardLayout = ({ user, children, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = {
    SUPERADMIN: [
      { icon: Building2, label: 'Companies', path: '/' },
      { icon: Users, label: 'Users', path: '/users' },
      { icon: FileText, label: 'Reports', path: '/reports' }
    ],
    ADMIN: [
      { icon: FileText, label: 'Dashboard', path: '/' },
      { icon: FileText, label: 'Work Orders', path: '/work-orders' },
      { icon: Users, label: 'Clients', path: '/clients' },
      { icon: Users, label: 'Employees', path: '/employees' },
      { icon: FileText, label: 'Reports', path: '/reports' }
    ],
    EMPLOYEE: [
      { icon: FileText, label: 'My Work Orders', path: '/' },
      { icon: Bell, label: 'Notifications', path: '/notifications' }
    ],
    CLIENT: [
      { icon: FileText, label: 'My Orders', path: '/' },
      { icon: FileText, label: 'Invoices', path: '/invoices' }
    ]
  };

  const menu = menuItems[user.role] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" data-testid="dashboard-layout">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-white shadow-xl border-r border-slate-200`}
        style={{ width: '280px' }}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800" style={{fontFamily: 'Space Grotesk'}}>Enterprise Hub</h2>
                <p className="text-xs text-slate-500">{user.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menu.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl font-medium"
                  data-testid={`nav-${item.label.toLowerCase().replace(/ /g, '-')}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                  {user.display_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{user.display_name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
            </div>
            <Button
              onClick={onLogout}
              variant="outline"
              className="w-full"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? 'ml-[280px]' : 'ml-0'
        }`}
      >
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg"
              data-testid="sidebar-toggle"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <Bell className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
