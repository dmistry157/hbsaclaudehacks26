import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import VariantApp from './pages/VariantApp'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<VariantApp />} />
    </Routes>
  )
}
