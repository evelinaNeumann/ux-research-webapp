import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';
import { UserDataPage } from './pages/UserDataPage';
import { SessionPage } from './pages/SessionPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminAnalyticsPage } from './pages/AdminAnalyticsPage';
import { ProfileSetupPage } from './pages/ProfileSetupPage';
import { MyProfileDataPage } from './pages/MyProfileDataPage';

function Protected({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminOnly({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export function App({ user, setUser }) {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage onAuth={setUser} />} />
      <Route path="/register" element={<RegisterPage onAuth={setUser} />} />

      <Route
        element={
          <Protected user={user}>
            <AppLayout user={user} />
          </Protected>
        }
      >
        <Route path="/" element={<DashboardPage user={user} />} />
        <Route path="/session/:sessionId" element={<SessionPage />} />
        <Route path="/profile-setup/:studyId" element={<ProfileSetupPage />} />
        <Route path="/my-profile-data" element={<MyProfileDataPage />} />
        <Route path="/user-data" element={<UserDataPage />} />
        <Route
          path="/admin/users"
          element={
            <AdminOnly user={user}>
              <AdminUsersPage />
            </AdminOnly>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <AdminOnly user={user}>
              <AdminAnalyticsPage />
            </AdminOnly>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminOnly user={user}>
              <AdminPage />
            </AdminOnly>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  );
}
