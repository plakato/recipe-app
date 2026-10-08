-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "scanPaths" TEXT;

-- Photo recipes so far showed their scan as the picture: keep it as their scan.
UPDATE "Recipe" SET "scanPaths" = json_array("imagePath")
WHERE "sourceType" = 'photo' AND "imagePath" IS NOT NULL;
