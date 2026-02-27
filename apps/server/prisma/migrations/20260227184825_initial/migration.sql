-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('waiting', 'active', 'finished');

-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('online', 'offline');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('waiting', 'active', 'finished');

-- CreateEnum
CREATE TYPE "DiscColor" AS ENUM ('red', 'yellow');

-- CreateEnum
CREATE TYPE "FinishReason" AS ENUM ('win', 'draw', 'timeout', 'disconnect');

-- CreateEnum
CREATE TYPE "TimeControlType" AS ENUM ('none', 'clock');

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "inviteToken" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'waiting',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "roomId" TEXT,
    "mode" "GameMode" NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'waiting',
    "timeControlType" "TimeControlType" NOT NULL,
    "secondsPerPlayer" INTEGER,
    "finishedReason" "FinishReason",
    "winnerColor" "DiscColor",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "difficulty" TEXT,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSeat" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "seat" TEXT NOT NULL,
    "color" "DiscColor" NOT NULL,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),

    CONSTRAINT "PlayerSeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Move" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "moveNumber" INTEGER NOT NULL,
    "color" "DiscColor" NOT NULL,
    "column" INTEGER NOT NULL,
    "row" INTEGER NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeLeftAfterMoveMs" INTEGER,

    CONSTRAINT "Move_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rematch" (
    "id" TEXT NOT NULL,
    "previousGameId" TEXT NOT NULL,
    "newGameId" TEXT NOT NULL,
    "colorsSwapped" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rematch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_inviteToken_key" ON "Room"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSeat_gameId_seat_key" ON "PlayerSeat"("gameId", "seat");

-- CreateIndex
CREATE UNIQUE INDEX "Move_gameId_moveNumber_key" ON "Move"("gameId", "moveNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Rematch_previousGameId_newGameId_key" ON "Rematch"("previousGameId", "newGameId");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSeat" ADD CONSTRAINT "PlayerSeat_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Move" ADD CONSTRAINT "Move_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rematch" ADD CONSTRAINT "Rematch_previousGameId_fkey" FOREIGN KEY ("previousGameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rematch" ADD CONSTRAINT "Rematch_newGameId_fkey" FOREIGN KEY ("newGameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
