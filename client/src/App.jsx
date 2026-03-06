import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
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
import { PrivacyConsentPage } from './pages/PrivacyConsentPage';
import { StudyFlowPage } from './pages/StudyFlowPage';
import { AdminMixedStudiesPage } from './pages/AdminMixedStudiesPage';

function Protected({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminOnly({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function ConsentRequired({ user, children }) {
  const location = useLocation();
  const needsConsent = user?.role === 'user' && !!user?.requires_privacy_consent;
  if (needsConsent && location.pathname !== '/privacy-consent') {
    return <Navigate to="/privacy-consent" replace />;
  }
  return children;
}

export function App({ user, setUser }) {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage onAuth={setUser} />} />
      <Route path="/register" element={<RegisterPage onAuth={setUser} />} />
      <Route
        path="/privacy-consent"
        element={
          <Protected user={user}>
            <PrivacyConsentPage user={user} onAuth={setUser} />
          </Protected>
        }
      />

      <Route
        element={
          <Protected user={user}>
            <ConsentRequired user={user}>
              <AppLayout user={user} />
            </ConsentRequired>
          </Protected>
        }
      >
        <Route path="/" element={<DashboardPage user={user} />} />
        <Route path="/session/:sessionId" element={<SessionPage />} />
        <Route path="/study-flow/:studyId" element={<StudyFlowPage user={user} />} />
        <Route path="/profile-setup/:studyId" element={<ProfileSetupPage />} />
        <Route path="/my-profile-data" element={<MyProfileDataPage />} />
        <Route path="/user-data" element={<UserDataPage onAuth={setUser} />} />
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
        <Route
          path="/admin/mixed"
          element={
            <AdminOnly user={user}>
              <AdminMixedStudiesPage />
            </AdminOnly>
          }
        />
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to={user ? (user.role === 'user' && user.requires_privacy_consent ? '/privacy-consent' : '/') : '/login'}
            replace
          />
        }
      />
    </Routes>
  );
}
