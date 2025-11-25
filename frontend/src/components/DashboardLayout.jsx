import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import {
  Building2,
  Users,
  FileText,
  Bell,
  LogOut,
  Menu,
  X,
  Home,
  Car,
  Wrench,
  Calendar,
  BarChart3,
  DollarSign
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import NotificationPopup from './NotificationPopup';

const DashboardLayout = ({ user, onLogout, children }) => {
  // Start with sidebar closed on mobile, open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [company, setCompany] = useState(null);
  const [notificationPopupOpen, setNotificationPopupOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Open sidebar by default on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();

    // Listen for window resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch company data for admins
  useEffect(() => {
    if (user.role === 'ADMIN' && user.company_id) {
      axios.get(`${API}/companies/${user.company_id}`)
        .then(response => setCompany(response.data))
        .catch(error => console.error('Error fetching company data:', error));
    }
  }, [user]);

  // Fetch notification count for all users except clients
  useEffect(() => {
    if (user && user.role !== 'CLIENT') {
      fetchNotificationCount();
    }
  }, [user]);

  const fetchNotificationCount = async () => {
    try {
      const response = await axios.get(`${API}/users/${user.id}/notifications`);
      const unreadCount = response.data.filter(n => !n.read_at).length;
      setNotificationCount(unreadCount);
    } catch (error) {
      // Silently fail
    }
  };

  const handleNotificationCountChange = (count) => {
    setNotificationCount(count);
  };

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
      { icon: Users, label: 'Users', path: '/users' },
      { icon: Users, label: 'Clients', path: '/clients' },
      { icon: DollarSign, label: 'Pending Payments', path: '/pending-payments' },
      { icon: FileText, label: 'Reports', path: '/reports' }
    ],
    EMPLOYEE: [
      { icon: FileText, label: 'My Work Orders', path: '/' }
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
        items.splice(4, 0, { icon: Car, label: 'Vehicles', path: '/vehicles' });
      } else if (company.industry === 'technical_solutions') {
        // Add preventive maintenance for technical solutions companies
        items.splice(4, 0, { icon: Wrench, label: 'Preventive Maintenance', path: '/preventive-maintenance' });
      }

      return items;
    }

    return baseMenuItems[user.role] || [];
  };

  const menu = getMenuItems();

  // Close sidebar on mobile when navigating
  const handleNavigation = (path) => {
    navigate(path);
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Responsive */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform duration-300 bg-white shadow-xl border-r border-slate-200 w-full max-w-xs sm:max-w-sm lg:w-80
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-4 md:p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-sm md:text-base text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>DataStream</h2>
                  <p className="text-xs text-slate-500">{user.role}</p>
                </div>
              </div>
              {/* Close button for mobile */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation - Touch-friendly */}
          <nav className="flex-1 p-3 md:p-4 space-y-1 md:space-y-2 overflow-y-auto">
            {menu.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={index}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-3 px-3 md:px-4 py-3 md:py-3 text-sm md:text-base text-slate-700 hover:bg-slate-50 rounded-xl font-medium text-left transition-colors min-h-[44px]
                    ${active ? 'bg-blue-50 text-blue-600 border border-blue-200' : ''}
                  `}
                  data-testid={`nav-${item.label.toLowerCase().replace(/ /g, '-')}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}</nav>

          {/* User Info - Responsive */}
          <div className="p-3 md:p-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base flex-shrink-0">
                  {user.display_name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-semibold text-slate-800 truncate">{user.display_name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
            </div>
            <Button
              onClick={onLogout}
              variant="outline"
              className="w-full min-h-[44px]"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content - Responsive */}
      <div className="flex-1 lg:ml-80 transition-all duration-300">
        {/* Top Bar - Mobile-friendly */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              data-testid="sidebar-toggle"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 md:gap-4">
              {user && user.role !== 'CLIENT' && (
                <button
                  onClick={() => setNotificationPopupOpen(!notificationPopupOpen)}
                  className="relative p-2 hover:bg-slate-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Bell className="w-5 h-5" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {notificationCount}
                    </span>
                  )}
                </button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="hidden md:flex"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content - Responsive padding */}
        <main className="p-2 sm:p-4 md:p-6 lg:p-8">{children}</main>
      </div>

      {/* Notification Popup */}
      <NotificationPopup
        user={user}
        isOpen={notificationPopupOpen}
        onClose={() => setNotificationPopupOpen(false)}
        onNotificationCountChange={handleNotificationCountChange}
      />
    </div>
  );
};

export default DashboardLayout;