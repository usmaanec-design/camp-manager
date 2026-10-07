import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { firebaseSyncService } from './services/firebaseSyncService';
import { LanguageProvider } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

// Public pages
import { UserLoginPage } from './pages/auth/UserLoginPage';
import { UserSignupPage } from './pages/auth/UserSignupPage';
import { AdminLoginPage } from './pages/auth/AdminLoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Layouts
import { AdminLayout } from './components/layout/AdminLayout';
import { UserLayout } from './components/layout/UserLayout';

// Admin pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { ProjectsPage } from './pages/admin/ProjectsPage';
import { ProjectDetailPage } from './pages/admin/ProjectDetailPage';
import { UserDetailPage } from './pages/admin/UserDetailPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { CampsPage } from './pages/admin/CampsPage';
import { VehiclesPage } from './pages/admin/VehiclesPage';
import { ManpowerPage } from './pages/admin/ManpowerPage';
import { InventoryPage } from './pages/admin/InventoryPage';
import { OperationsPage } from './pages/admin/OperationsPage';
import { UtilitiesPage } from './pages/admin/UtilitiesPage';
import { AdminExcelPage } from './pages/admin/AdminExcelPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminJobTitlesPage } from './pages/admin/AdminJobTitlesPage';

// User pages
import { UserDashboardPage } from './pages/user/UserDashboardPage';
import { MyCampPage } from './pages/user/MyCampPage';
import { BuildingDetailPage } from './pages/user/BuildingDetailPage';
import { MyReportsPage } from './pages/user/MyReportsPage';
import { AddReportPage } from './pages/user/AddReportPage';
import { ReportDetailPage } from './pages/user/ReportDetailPage';
import { UserExcelPage } from './pages/user/UserExcelPage';
import { UserProfilePage } from './pages/user/UserProfilePage';
import { UserSettingsPage } from './pages/user/UserSettingsPage';
import { UserCampInventoryPage } from './pages/user/UserCampInventoryPage';
import { UserManpowerPage } from './pages/user/UserManpowerPage';
import { UtilityBuildingsPage } from './pages/user/UtilityBuildingsPage';
import { UtilityBuildingDetailPage } from './pages/user/UtilityBuildingDetailPage';
import { UtilitiesHubPage } from './pages/user/UtilitiesHubPage';
import { WaterUsagePage } from './pages/user/WaterUsagePage';
import { GasUsagePage } from './pages/user/GasUsagePage';
import { FuelUsagePage } from './pages/user/FuelUsagePage';

// Route Guard components
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return <Navigate to="/app" replace />;
  return <>{children}</>;
};

const UserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export const App: React.FC = () => {
  useEffect(() => {
    firebaseSyncService.initSync();
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              {/* Public Routes: Root "/" is explicitly UserLoginPage */}
              <Route path="/" element={<UserLoginPage />} />
              <Route path="/login" element={<UserLoginPage />} />
              <Route path="/signup" element={<UserSignupPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Admin Portal Namespace */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                }
              >
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/:projectId" element={<ProjectDetailPage />} />
                <Route path="users" element={<Navigate to="/admin/projects?tab=users" replace />} />
                <Route path="users/:userId" element={<UserDetailPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="camps" element={<CampsPage />} />
                <Route path="vehicles" element={<VehiclesPage />} />
                <Route path="manpower" element={<ManpowerPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="operations" element={<OperationsPage />} />
                <Route path="utilities" element={<UtilitiesPage />} />
                <Route path="excel" element={<AdminExcelPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="settings/job-titles" element={<AdminJobTitlesPage />} />
              </Route>

              {/* User Portal Namespace */}
              <Route
                path="/app"
                element={
                  <UserRoute>
                    <UserLayout />
                  </UserRoute>
                }
              >
                <Route index element={<UserDashboardPage />} />
                <Route path="camp" element={<MyCampPage />} />
                <Route path="camp/buildings/:buildingId" element={<BuildingDetailPage />} />
                <Route path="my-camp" element={<MyCampPage />} />
                <Route path="my-camp/buildings/:buildingId" element={<BuildingDetailPage />} />
                <Route path="utilities" element={<UtilitiesHubPage />} />
                <Route path="utilities/water" element={<WaterUsagePage />} />
                <Route path="utilities/gas" element={<GasUsagePage />} />
                <Route path="utilities/fuel" element={<FuelUsagePage />} />
                <Route path="utilities/facilities" element={<UtilityBuildingsPage />} />
                <Route path="utilities/facilities/:buildingId" element={<UtilityBuildingDetailPage />} />
                <Route path="utilities/:buildingId" element={<UtilityBuildingDetailPage />} />
                <Route path="utility-buildings" element={<UtilityBuildingsPage />} />
                <Route path="utility-buildings/:buildingId" element={<UtilityBuildingDetailPage />} />
                <Route path="manpower" element={<UserManpowerPage />} />
                <Route path="inventory" element={<UserCampInventoryPage />} />
                <Route path="reports" element={<MyReportsPage />} />
                <Route path="reports/new" element={<AddReportPage />} />
                <Route path="reports/:reportId" element={<ReportDetailPage />} />
                <Route path="excel" element={<UserExcelPage />} />
                <Route path="profile" element={<UserProfilePage />} />
                <Route path="settings" element={<UserSettingsPage />} />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
