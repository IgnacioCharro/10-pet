import { Outlet } from 'react-router-dom'
import NavBar from '../components/NavBar'

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar />
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
    </div>
  )
}
