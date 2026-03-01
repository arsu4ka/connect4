# Connect Four (Bun + TypeScript)

Browser game with:

- offline mode vs AI (easy/medium/hard)
- online realtime mode by invite link
- chess-clock time control (or no timer)
- rematch with color swap
- PostgreSQL persistence for all games

## Stack

- Frontend: React + Vite + TailwindCSS + Framer Motion
- Backend: Bun + Elysia + WebSocket
- DB: PostgreSQL + Prisma v7
- Tests: Vitest (unit)
- Tooling: ESLint + Prettier

## Monorepo layout

- `apps/client` - React frontend
- `apps/server` - Bun server, game engine, realtime
- `packages/shared` - shared TypeScript contracts (used directly as TS, no dist build)

## Local setup

1. Copy env:

```bash
cp apps/server/.env.example apps/server/.env
```

2. Install deps:

```bash
bun install
```

3. Generate Prisma client and run migrations:

```bash
bun run prisma:generate
bun run prisma:migrate
```

4. Run app:

```bash
bun run dev
```

- client: `http://localhost:5173`
- server: `http://localhost:3001`

## Scripts

```bash
bun run lint
bun run format:check
bun run typecheck
bun run test
bun run build
```

Notes:

- `build` only builds frontend bundle (`apps/client`).
- Backend and shared packages run directly from TypeScript on Bun.

## Docker setup

```bash
docker compose up --build
```

### Embedded Prisma Studio

This project includes an embedded Prisma Studio page at `/studio` with server-side token auth.

- API endpoint: `POST /api/studio`
- Client page: `/studio`
- Auth header: `Authorization: Bearer <STUDIO_ADMIN_TOKEN>`

Recommended production setup uses a separate subdomain:

- app: `https://connect4.example.com`
- studio: `https://db.connect4.example.com/studio`

Required server env:

- `STUDIO_ENABLED=true`
- `STUDIO_ALLOWED_HOST=db.connect4.example.com`
- `STUDIO_ADMIN_TOKEN=<strong-secret>`

## Key endpoints

- `POST /api/rooms` - create online room
- `GET /api/invite/:inviteToken` - preview invite
- `POST /api/invite/:inviteToken/join` - join room
- `POST /api/offline/games` - persist offline game
- `GET /api/games/:gameId` - game history + moves
- `WS /ws/rooms/:roomId` - realtime room channel
