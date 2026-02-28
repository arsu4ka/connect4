FROM oven/bun:1.3.10
WORKDIR /app

COPY bun.lock package.json tsconfig.base.json ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN bun install

COPY apps/server /app/apps/server
COPY packages/shared /app/packages/shared
RUN bun install --cwd apps/server
RUN bun run --filter @connect4/server prisma:generate
RUN bun run --filter @connect4/server typecheck

EXPOSE 3001
CMD ["bun", "apps/server/src/index.ts"]
