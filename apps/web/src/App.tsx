import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { InstallBanner } from './components/InstallBanner'
import { NotificationPermission } from './components/NotificationPermission'

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <NotificationPermission />
      <InstallBanner />
    </>
  )
}
