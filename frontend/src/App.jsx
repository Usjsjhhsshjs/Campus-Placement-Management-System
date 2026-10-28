import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/Layout";
import { RedirectIfLoggedIn, RequireRole } from "./components/Guards";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import StudentDashboard from "./pages/student/Dashboard";
import Jobs from "./pages/student/Jobs";
import JobDetail from "./pages/student/JobDetail";
import Applications from "./pages/student/Applications";
import StudentProfile from "./pages/student/Profile";
import RecruiterDashboard from "./pages/recruiter/Dashboard";
import Postings from "./pages/recruiter/Postings";
import PostingForm from "./pages/recruiter/PostingForm";
import Applicants from "./pages/recruiter/Applicants";
import ApplicantDetail from "./pages/recruiter/ApplicantDetail";
import RecruiterProfile from "./pages/recruiter/Profile";
import Notifications from "./pages/shared/Notifications";
import Interviews from "./pages/shared/Interviews";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<RedirectIfLoggedIn><Login /></RedirectIfLoggedIn>} />
      <Route path="/register" element={<RedirectIfLoggedIn><Register /></RedirectIfLoggedIn>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/student" element={<RequireRole role="student" />}>
        <Route element={<AppShell />}>
          <Route index element={<StudentDashboard />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/:id" element={<JobDetail />} />
          <Route path="applications" element={<Applications />} />
          <Route path="interviews" element={<Interviews />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>
      </Route>

      <Route path="/recruiter" element={<RequireRole role="recruiter" />}>
        <Route element={<AppShell />}>
          <Route index element={<RecruiterDashboard />} />
          <Route path="postings" element={<Postings />} />
          <Route path="postings/new" element={<PostingForm />} />
          <Route path="postings/:id/edit" element={<PostingForm />} />
          <Route path="applicants" element={<Applicants />} />
          <Route path="applicants/:id" element={<ApplicantDetail />} />
          <Route path="interviews" element={<Interviews />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<RecruiterProfile />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
