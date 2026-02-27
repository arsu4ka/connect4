import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { OfflinePage } from './pages/OfflinePage';
import { OnlineCreatePage } from './pages/OnlineCreatePage';
import { OnlineJoinPage } from './pages/OnlineJoinPage';
import { OnlineGamePage } from './pages/OnlineGamePage';
export default function App() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(HomePage, {}) }), _jsx(Route, { path: "/offline", element: _jsx(OfflinePage, {}) }), _jsx(Route, { path: "/online/create", element: _jsx(OnlineCreatePage, {}) }), _jsx(Route, { path: "/online/join/:inviteToken", element: _jsx(OnlineJoinPage, {}) }), _jsx(Route, { path: "/online/game/:roomId", element: _jsx(OnlineGamePage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
