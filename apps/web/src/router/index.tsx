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
import ProtectedRoute from './ProtectedRoute'
import AdminRoute from './AdminRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'cases', element: <CasesPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'auth/verified', element: <VerifyEmailPage /> },
      { path: 'auth/callback', element: <AuthCallbackPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'cases/new', element: <PublishCasePage /> },
          { path: 'profile', element: <ProfilePage /> },
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
