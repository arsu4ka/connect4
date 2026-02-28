-- Add self-reference for rematch chain directly on Game
ALTER TABLE "Game" ADD COLUMN "previousGameId" TEXT;

-- Backfill existing rematch links, if any
UPDATE "Game" AS g
SET "previousGameId" = r."previousGameId"
FROM "Rematch" AS r
WHERE g."id" = r."newGameId"
  AND g."previousGameId" IS NULL;

-- Add index + FK for previousGameId
CREATE INDEX "Game_previousGameId_idx" ON "Game"("previousGameId");

ALTER TABLE "Game"
ADD CONSTRAINT "Game_previousGameId_fkey"
FOREIGN KEY ("previousGameId") REFERENCES "Game"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Rematch table is replaced by Game.previousGameId
DROP TABLE "Rematch";
