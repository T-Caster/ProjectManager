import {Routes, Route} from "react-router-dom"
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import AuthGuard from "./components/AuthGuard";
import AuthRoute from "./components/AuthRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={
        <AuthRoute>
          <LoginPage />
        </AuthRoute>
      } />
      <Route path="/login" element={
        <AuthRoute>
          <LoginPage />
        </AuthRoute>
      } />
      <Route path="/register" element={
        <AuthRoute>
          <RegisterPage />
        </AuthRoute>
      } />
      <Route path="/forgot-password" element={
        <AuthRoute>
          <ForgotPasswordPage />
        </AuthRoute>
      } />
      <Route path="/reset-password" element={
        <AuthRoute>
          <ResetPasswordPage />
        </AuthRoute>
      } />
      <Route
        path="/dashboard"
        element={
          <AuthGuard>
            <DashboardPage />
          </AuthGuard>
        }
      />
      <Route
        path="/profile"
        element={
          <AuthGuard>
            <ProfilePage />
          </AuthGuard>
        }
      />
    </Routes>
  );
}
