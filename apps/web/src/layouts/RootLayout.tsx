import { Outlet } from 'react-router-dom'
import NavBar from '../components/NavBar'
import BetaBanner from '../components/BetaBanner'

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <BetaBanner />
      <NavBar />
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
    </div>
  )
}
