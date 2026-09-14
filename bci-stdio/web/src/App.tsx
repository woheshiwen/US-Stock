import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { LandingPage } from './pages/Landing'
import { SignInPage } from './pages/SignIn'
import { StudioPage } from './studio/Studio'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/stdio" element={<StudioPage />} />
        <Route path="/stdio/sign-in" element={<Navigate to="/sign-in" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
