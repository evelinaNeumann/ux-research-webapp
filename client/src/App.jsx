import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';

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
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <Protected user={user}>
            <AppLayout user={user} />
          </Protected>
        }
      >
        <Route path="/" element={<DashboardPage />} />
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
