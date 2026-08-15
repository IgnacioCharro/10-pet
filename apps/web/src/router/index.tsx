import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '../layouts/RootLayout'
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import VerifyEmailPage from '../pages/VerifyEmailPage'
import AuthCallbackPage from '../pages/AuthCallbackPage'
import DashboardPage from '../pages/DashboardPage'
import CasesPage from '../pages/CasesPage'
import PublishCasePage from '../pages/PublishCasePage'
import ProfilePage from '../pages/ProfilePage'
import NotFoundPage from '../pages/NotFoundPage'
import AdminPage from '../pages/AdminPage'
import CasePage from '../pages/CasePage'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import ResetPasswordPage from '../pages/ResetPasswordPage'
import PublicProfilePage from '../pages/PublicProfilePage'
import ContactThreadPage from '../pages/ContactThreadPage'
import ProtectedRoute from './ProtectedRoute'
import AdminRoute from './AdminRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'cases/:id', element: <CasePage /> },
      { path: 'users/:id', element: <PublicProfilePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'auth/verified', element: <VerifyEmailPage /> },
      { path: 'auth/callback', element: <AuthCallbackPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      {
        element: <ProtectedRoute redirectTo="/register" />,
        children: [
          { path: 'cases', element: <CasesPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'cases/new', element: <PublishCasePage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'contacts/:id', element: <ContactThreadPage /> },
        ],
      },
      {
        element: <AdminRoute />,
        children: [
          { path: 'admin', element: <AdminPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
