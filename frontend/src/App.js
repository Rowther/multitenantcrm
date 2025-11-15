import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SamaAlJazeeraDashboard from './pages/SamaAlJazeeraDashboard';
import VigorAutomotiveDashboard from './pages/VigorAutomotiveDashboard';
import MSAMTechnicalDashboard from './pages/MSAMTechnicalDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ClientDashboard from './pages/ClientDashboard';
import PreventiveMaintenancePage from './pages/PreventiveMaintenancePage';
import VehiclesPage from './pages/VehiclesPage';
import ReportsPage from './pages/ReportsPage';
import SuperAdminReportsPage from './pages/SuperAdminReportsPage'; // Add SuperAdminReportsPage import
import CompanyDetails from './pages/CompanyDetails';
import WorkOrdersPage from './pages/WorkOrdersPage';
import WorkOrderDetailsPage from './pages/WorkOrderDetailsPage';
import ClientsPage from './pages/ClientsPage';
import EmployeesPage from './pages/EmployeesPage';
import UsersPage from './pages/UsersPage'; // Add UsersPage import
import LogsPage from './pages/LogsPage';
import { Toaster } from './components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userCompany, setUserCompany] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.get(`${API}/users/me`);
        setUser(response.data);
        
        // If user is an admin, fetch their company details
        if (response.data.role === 'ADMIN' && response.data.company_id) {
          try {
            const companyResponse = await axios.get(`${API}/companies/${response.data.company_id}`);
            setUserCompany(companyResponse.data);
          } catch (error) {
            // console.error('Error fetching company data:', error);
          }
        }
      } catch (error) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  const handleLogin = (userData, token) => {
    // Fix: Make sure we're handling the token correctly
    const actualToken = token || userData.token;
    const actualUser = userData.user || userData;
    
    localStorage.setItem('token', actualToken);
    setUser(actualUser);
    
    // If user is an admin, fetch their company details
    if (actualUser.role === 'ADMIN' && actualUser.company_id) {
      axios.get(`${API}/companies/${actualUser.company_id}`)
        .then(response => setUserCompany(response.data))
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setUserCompany(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!user) return <Navigate to="/login" />;
    if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
    return children;
  };

  const getDashboard = () => {
    if (!user) return <Navigate to="/login" />;
    
    switch (user.role) {
      case 'SUPERADMIN':
        return <SuperAdminDashboard user={user} onLogout={handleLogout} />;
      case 'ADMIN':
        // Route to specific dashboard based on company industry
        if (userCompany) {
          switch (userCompany.industry) {
            case 'furniture':
              return <SamaAlJazeeraDashboard user={user} onLogout={handleLogout} />;
            case 'automotive':
              return <VigorAutomotiveDashboard user={user} onLogout={handleLogout} />;
            case 'technical_solutions':
              return <MSAMTechnicalDashboard user={user} onLogout={handleLogout} />;
            default:
              return <AdminDashboard user={user} onLogout={handleLogout} />;
          }
        } else {
          // Fallback to generic admin dashboard while loading company data
          return <AdminDashboard user={user} onLogout={handleLogout} />;
        }
      case 'EMPLOYEE':
        return <EmployeeDashboard user={user} onLogout={handleLogout} />;
      case 'CLIENT':
        return <ClientDashboard user={user} onLogout={handleLogout} />;
      default:
        return <Navigate to="/login" />;
    }
  };

  return (
    <div className="App">
      <HashRouter>
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} 
          />
          <Route path="/" element={<ProtectedRoute><div>{getDashboard()}</div></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN']}><UsersPage user={user} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN']}>{user?.role === 'SUPERADMIN' ? <SuperAdminReportsPage user={user} onLogout={handleLogout} /> : <ReportsPage user={user} onLogout={handleLogout} />}</ProtectedRoute>} />
          <Route path="/logs-dev" element={<ProtectedRoute allowedRoles={['SUPERADMIN']}><LogsPage user={user} onLogout={handleLogout} /></ProtectedRoute>} /> {/* Added logs route */}
          <Route path="/companies/:companyId" element={<ProtectedRoute allowedRoles={['SUPERADMIN']}><CompanyDetails user={user} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/companies/:companyId/workorders/:workOrderId" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'EMPLOYEE', 'CLIENT']}><WorkOrderDetailsPage user={user} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/work-orders" element={<ProtectedRoute allowedRoles={['ADMIN']}><WorkOrdersPage user={user} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute allowedRoles={['ADMIN']}><ClientsPage user={user} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute allowedRoles={['ADMIN']}><EmployeesPage user={user} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/preventive-maintenance" element={<ProtectedRoute allowedRoles={['ADMIN']}><PreventiveMaintenancePage user={user} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/vehicles" element={<ProtectedRoute allowedRoles={['ADMIN']}><VehiclesPage user={user} onLogout={handleLogout} /></ProtectedRoute>} />
        </Routes>
      </HashRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;