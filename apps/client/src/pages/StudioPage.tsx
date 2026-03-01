import { createStudioBFFClient } from '@prisma/studio-core/data/bff';
import { createPostgresAdapter } from '@prisma/studio-core/data/postgres-core';
import { Studio } from '@prisma/studio-core/ui';
import '@prisma/studio-core/ui/index.css';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../lib/config';

const STUDIO_TOKEN_STORAGE_KEY = 'c4_studio_admin_token';
const STUDIO_API_URL = `${API_BASE_URL}/api/studio`;

function getInitialToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STUDIO_TOKEN_STORAGE_KEY) ?? '';
}

export function StudioPage() {
  const [token, setToken] = useState<string>(() => getInitialToken());
  const [inputToken, setInputToken] = useState(token);

  const adapter = useMemo(() => {
    if (!token) return null;

    const executor = createStudioBFFClient({
      url: STUDIO_API_URL,
      customHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return createPostgresAdapter({ executor });
  }, [token]);

  function saveToken() {
    const trimmed = inputToken.trim();
    if (!trimmed) return;

    window.localStorage.setItem(STUDIO_TOKEN_STORAGE_KEY, trimmed);
    setToken(trimmed);
  }

  function resetToken() {
    window.localStorage.removeItem(STUDIO_TOKEN_STORAGE_KEY);
    setToken('');
    setInputToken('');
  }

  if (!adapter) {
    return (
      <div className="studio-auth-shell">
        <div className="studio-auth-card">
          <p className="panel-eyebrow">Admin</p>
          <h1 className="font-display text-4xl text-white">Prisma Studio</h1>
          <p className="text-sm text-slate-200/85">
            Enter `STUDIO_ADMIN_TOKEN` to access the database viewer.
          </p>

          <label className="field-group">
            <span>Admin token</span>
            <input
              type="password"
              autoComplete="current-password"
              value={inputToken}
              onChange={(event) => setInputToken(event.target.value)}
              placeholder="Paste token"
            />
          </label>

          <div className="flex gap-2">
            <button type="button" className="primary-button" onClick={saveToken}>
              Open Studio
            </button>
            <Link to="/" className="ghost-button inline-flex items-center justify-center">
              Back to game
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-shell">
      <div className="studio-topbar">
        <p className="font-display text-xl text-white">Prisma Studio</p>
        <div className="flex gap-2">
          <button type="button" className="ghost-button" onClick={resetToken}>
            Sign out
          </button>
          <Link to="/" className="ghost-button inline-flex items-center">
            Back to game
          </Link>
        </div>
      </div>

      <div className="studio-app-wrap">
        <Studio adapter={adapter} />
      </div>
    </div>
  );
}
