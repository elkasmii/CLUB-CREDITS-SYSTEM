import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { RequireAuth } from './components/RequireAuth';
import { AuthProvider, homePathFor, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { AdminLayout } from './layouts/AdminLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { MemberLayout } from './layouts/MemberLayout';
import { AdminDashboardPage } from './pages/admin/DashboardPage';
import { GiveCreditsPage } from './pages/admin/GiveCreditsPage';
import { MemberDetailPage } from './pages/admin/MemberDetailPage';
import { MembersPage } from './pages/admin/MembersPage';
import { QrCampaignDetailPage } from './pages/admin/QrCampaignDetailPage';
import { QrCampaignsPage } from './pages/admin/QrCampaignsPage';
import { ReservationsPage } from './pages/admin/ReservationsPage';
import { AdminStorePage } from './pages/admin/StorePage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { CreditsPage } from './pages/member/CreditsPage';
import { MemberDashboardPage } from './pages/member/DashboardPage';
import { ProfilePage } from './pages/member/ProfilePage';
import { MemberReservationsPage } from './pages/member/ReservationsPage';
import { ScannerPage } from './pages/member/ScannerPage';
import { MemberStorePage } from './pages/member/StorePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { LoadingState } from './components/ui/States';

function RootRedirect() {
  const { user, initializing } = useAuth();
  if (initializing) return <LoadingState />;
  return <Navigate to={user ? homePathFor(user) : '/login'} replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />

            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            <Route
              path="/admin"
              element={
                <RequireAuth role="ADMIN">
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="members/:id" element={<MemberDetailPage />} />
              <Route path="qr" element={<QrCampaignsPage />} />
              <Route path="qr/:id" element={<QrCampaignDetailPage />} />
              <Route path="credits" element={<GiveCreditsPage />} />
              <Route path="store" element={<AdminStorePage />} />
              <Route path="reservations" element={<ReservationsPage />} />
            </Route>

            <Route
              path="/member"
              element={
                <RequireAuth role="MEMBER">
                  <MemberLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<MemberDashboardPage />} />
              <Route path="credits" element={<CreditsPage />} />
              <Route path="scanner" element={<ScannerPage />} />
              <Route path="store" element={<MemberStorePage />} />
              <Route path="reservations" element={<MemberReservationsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
