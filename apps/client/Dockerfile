FROM oven/bun:1.2.5
WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:3001
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json tsconfig.base.json ./
COPY apps/client/package.json apps/client/
COPY packages/shared/package.json packages/shared/
RUN bun install

COPY . .
RUN bun run --filter @connect4/shared build
RUN bun run --filter @connect4/client build

EXPOSE 4173
CMD ["bun", "run", "--filter", "@connect4/client", "preview", "--host", "0.0.0.0", "--port", "4173"]
