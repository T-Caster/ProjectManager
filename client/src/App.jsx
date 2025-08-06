import { Routes, Route } from "react-router-dom"
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import AuthGuard from "./components/AuthGuard";
import AuthRoute from "./components/AuthRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import RoleBasedGuard from "./components/RoleBasedGuard";
import ProposeProjectPage from "./pages/ProposeProjectPage";
import ScheduleMeetingPage from "./pages/ScheduleMeetingPage";
import TasksPage from "./pages/TasksPage";
import MyStudentsPage from "./pages/MyStudentsPage";
import MeetingsPage from "./pages/MeetingsPage";
import MentorRequestsPage from "./pages/MentorRequestsPage";
import AllProjectsPage from "./pages/AllProjectsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
      <Route path="/forgot-password" element={<AuthRoute><ForgotPasswordPage /></AuthRoute>} />
      <Route path="/reset-password" element={<AuthRoute><ResetPasswordPage /></AuthRoute>} />
      <Route path="/reset-password/:token" element={<AuthRoute><ResetPasswordPage /></AuthRoute>} />

      <Route element={<AuthGuard><DashboardLayout /></AuthGuard>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/:id" element={<ProfilePage />} />

        {/* Student Routes */}
        <Route element={<RoleBasedGuard roles={['student']} />}>
          <Route path="/propose-project" element={<ProposeProjectPage />} />
          <Route path="/schedule-meeting" element={<ScheduleMeetingPage />} />
          <Route path="/tasks" element={<TasksPage />} />
        </Route>

        {/* Mentor Routes */}
        <Route element={<RoleBasedGuard roles={['mentor']} />}>
          <Route path="/my-students" element={<MyStudentsPage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
        </Route>

        {/* HOD Routes */}
        <Route element={<RoleBasedGuard roles={['hod']} />}>
          <Route path="/mentor-requests" element={<MentorRequestsPage />} />
          <Route path="/all-projects" element={<AllProjectsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
