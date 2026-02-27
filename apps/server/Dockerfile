FROM oven/bun:1.2.5
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN bun install

COPY . .
RUN bun run --filter @connect4/shared build
RUN bun run --filter @connect4/server prisma:generate
RUN bun run --filter @connect4/server build

EXPOSE 3001
CMD ["bun", "apps/server/dist/index.js"]
