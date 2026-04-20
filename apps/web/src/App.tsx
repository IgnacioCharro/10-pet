import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { InstallBanner } from './components/InstallBanner'
import { NotificationPermission } from './components/NotificationPermission'
import ToastContainer from './components/ToastContainer'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <NotificationPermission />
      <InstallBanner />
      <ToastContainer />
    </ErrorBoundary>
  )
}
