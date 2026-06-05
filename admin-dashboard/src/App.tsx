import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import MedicineManagement from './pages/MedicineManagement';
import PrescriptionManagement from './pages/PrescriptionManagement';
import Payments from './pages/Payments';
import Notifications from './pages/Notifications';
import Pricing from './pages/Pricing';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes data fresh state
      gcTime: 10 * 60 * 1000,    // 10 minutes cache garbage collection
      refetchOnWindowFocus: false,
    },
  },
});

// Shared panel layout wrapping sections with the navigation sidebar
const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {children}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Auth Pathway */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Panel Pathways (Restricted to Authenticated Admins) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
              <Route path="/users" element={<DashboardLayout><UserManagement /></DashboardLayout>} />
              <Route path="/medicines" element={<DashboardLayout><MedicineManagement /></DashboardLayout>} />
              <Route path="/prescriptions" element={<DashboardLayout><PrescriptionManagement /></DashboardLayout>} />
              <Route path="/payments" element={<DashboardLayout><Payments /></DashboardLayout>} />
              <Route path="/notifications" element={<DashboardLayout><Notifications /></DashboardLayout>} />
              <Route path="/pricing" element={<DashboardLayout><Pricing /></DashboardLayout>} />
              <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
