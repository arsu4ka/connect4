import { Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { OfflinePage } from './pages/OfflinePage';
import { OnlineCreatePage } from './pages/OnlineCreatePage';
import { OnlineJoinPage } from './pages/OnlineJoinPage';
import { OnlineGamePage } from './pages/OnlineGamePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/offline" element={<OfflinePage />} />
      <Route path="/online/create" element={<OnlineCreatePage />} />
      <Route path="/online/join/:inviteToken" element={<OnlineJoinPage />} />
      <Route path="/online/game/:roomId" element={<OnlineGamePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
