
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import SuperAdminDashboard from '@/pages/SuperAdminDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import LoadingSpinner from '@/components/LoadingSpinner';
import SharedServiceView from './components/shared/SharedServiceView';
import Documentation from './pages/Documentation';
import AssistentStudy from './components/AI/AssistenStudy';

function App() {
  const { user, loading, userRole } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  const getDashboardRoute = (role) => {
    if (role === 'super_admin') return '/super-admin';
    if (role === 'admin') return '/admin';
    return '/';
  };

  return (
    <Routes> 
      <Route path="/" element={<LandingPage />} />
      <Route path='/chatStudy' element={<AssistentStudy/>}/>
      <Route path="/sharedsubmodules/:module_id/sub/:sub_id" element={<SharedServiceView />} />
      <Route path="/documentation" element={<Documentation/>} />
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={getDashboardRoute(userRole)} />} />
      <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to={getDashboardRoute(userRole)} />} />
      <Route 
        path="/super-admin/*" 
        element={user && userRole === 'super_admin' ? <SuperAdminDashboard /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/admin/*" 
        element={user && userRole === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} 
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
  