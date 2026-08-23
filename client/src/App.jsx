import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import RoomAccessPage from './pages/RoomAccessPage'
import ChatRoomPage from './pages/ChatRoomPage'
import NotFoundPage from './pages/NotFoundPage'
import HowItWorksPage from "./pages/HowItWorksPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/room" element={<RoomAccessPage />} />
      <Route path="/chat/:roomCode" element={<ChatRoomPage />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
    </Routes>
  )
}

export default App
