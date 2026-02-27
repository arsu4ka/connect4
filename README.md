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
- DB: PostgreSQL + Prisma
- Tests: Vitest (unit)

## Monorepo layout
- `apps/client` - React frontend
- `apps/server` - Bun server, game engine, realtime
- `packages/shared` - shared TypeScript contracts

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

## Docker setup
```bash
docker compose up --build
```

## Key endpoints
- `POST /api/rooms` - create online room
- `GET /api/invite/:inviteToken` - preview invite
- `POST /api/invite/:inviteToken/join` - join room
- `POST /api/offline/games` - persist offline game
- `GET /api/games/:gameId` - game history + moves
- `WS /ws/rooms/:roomId` - realtime room channel

## Test
```bash
bun run test
```
