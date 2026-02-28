import { Navigate, Route, Routes } from 'react-router-dom';
import { PlayPage } from './pages/PlayPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PlayPage />} />
      <Route path="/offline" element={<PlayPage />} />
      <Route path="/online/create" element={<PlayPage />} />
      <Route path="/online/join/:inviteToken" element={<PlayPage />} />
      <Route path="/online/game/:roomId" element={<PlayPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
