import React, { useState } from 'react';
import { Button } from './ui/button';
import { Building2, LogOut, Menu, X, Users, FileText, Truck, Wrench, Bell } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';

const DashboardLayout = ({ user, children, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [company, setCompany] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch company data for admins
  React.useEffect(() => {
    if (user.role === 'ADMIN' && user.company_id) {
      axios.get(`${API}/companies/${user.company_id}`)
        .then(response => setCompany(response.data))
        .catch(error => console.error('Error fetching company data:', error));
    }
  }, [user]);

  // Base menu items
  const baseMenuItems = {
    SUPERADMIN: [
      { icon: Building2, label: 'Companies', path: '/' },
      { icon: Users, label: 'Users', path: '/users' },
      { icon: FileText, label: 'Reports', path: '/reports' },
      { icon: FileText, label: 'Logs', path: '/logs-dev' }
    ],
    ADMIN: [
      { icon: FileText, label: 'Dashboard', path: '/' },
      { icon: FileText, label: 'Work Orders', path: '/work-orders' },
      { icon: Users, label: 'Users', path: '/users' }, // Add Users menu item
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

  // Get menu items based on user role and company
  const getMenuItems = () => {
    if (user.role === 'ADMIN' && company) {
      // Start with base admin items
      let items = [...baseMenuItems.ADMIN];
      
      // Add company-specific items
      if (company.industry === 'automotive') {
        // Add vehicles for automotive companies
        items.splice(4, 0, { icon: Truck, label: 'Vehicles', path: '/vehicles' });
      } else if (company.industry === 'technical_solutions') {
        // Add preventive maintenance for technical solutions companies
        items.splice(4, 0, { icon: Wrench, label: 'Preventive Maintenance', path: '/preventive-maintenance' });
      }
      
      return items;
    }
    
    return baseMenuItems[user.role] || [];
  };

  const menu = getMenuItems();

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

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
              const active = isActive(item.path);
              return (
                <button
                  key={index}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl font-medium text-left ${
                    active ? 'bg-blue-50 text-blue-600 border border-blue-200' : ''
                  }`}
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