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
import AllProjectsPage from "./pages/AllProjectsPage";
import { ProposalProvider } from "./contexts/ProposalContext";
import ProposalsQueuePage from "./pages/ProposalsQueuePage";
import ProposalReviewPage from "./pages/ProposalReviewPage";
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { MeetingProvider } from "./contexts/MeetingContext";
import { TaskProvider } from "./contexts/TaskContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectPage from "./pages/ProjectPage";

export default function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Routes>
        <Route path="/" element={<AuthRoute><LoginPage /></AuthRoute>} />
        <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
        <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
        <Route path="/forgot-password" element={<AuthRoute><ForgotPasswordPage /></AuthRoute>} />
        <Route path="/reset-password" element={<AuthRoute><ResetPasswordPage /></AuthRoute>} />
        <Route path="/reset-password/:token" element={<AuthRoute><ResetPasswordPage /></AuthRoute>} />

        <Route element={<AuthGuard><ProposalProvider><MeetingProvider><TaskProvider><ProjectProvider><DashboardLayout /></ProjectProvider></TaskProvider></MeetingProvider></ProposalProvider></AuthGuard>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectPage />} />

          {/* Student Routes */}
          <Route element={<RoleBasedGuard roles={['student']} />}>
            <Route path="/propose-project" element={<ProposeProjectPage />} />
            <Route path="/propose-project/:proposalId" element={<ProposeProjectPage />} />
            <Route path="/schedule-meeting" element={<ScheduleMeetingPage />} />
          </Route>

          {/* Mentor Routes */}
          <Route element={<RoleBasedGuard roles={['mentor', 'hod']} />}>
            <Route path="/my-students" element={<MyStudentsPage />} />
            <Route path="/meetings" element={<MeetingsPage />} />
          </Route>

          {/* HOD Routes */}
          <Route element={<RoleBasedGuard roles={['hod']} />}>
            <Route path="/all-projects" element={<AllProjectsPage />} />
            <Route path="/proposals-queue" element={<ProposalsQueuePage />} />
            <Route path="/proposal-review/:proposalId" element={<ProposalReviewPage />} />
          </Route>
        </Route>
      </Routes>
    </LocalizationProvider>
  );
}
