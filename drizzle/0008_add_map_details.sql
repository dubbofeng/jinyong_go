CREATE TABLE IF NOT EXISTS "maps_backup" (LIKE "maps" INCLUDING ALL);
INSERT INTO "maps_backup" SELECT * FROM "maps";

-- 添加章节字段
ALTER TABLE "maps" ADD COLUMN IF NOT EXISTS "chapter" INTEGER DEFAULT 0;

-- 添加需要等级字段
ALTER TABLE "maps" ADD COLUMN IF NOT EXISTS "min_level" INTEGER DEFAULT 1;

-- 添加在世界地图的坐标
ALTER TABLE "maps" ADD COLUMN IF NOT EXISTS "world_x" INTEGER;
ALTER TABLE "maps" ADD COLUMN IF NOT EXISTS "world_y" INTEGER;

-- 添加等距图文件路径
ALTER TABLE "maps" ADD COLUMN IF NOT EXISTS "isometric_image" VARCHAR(500);

-- 添加生成图片的提示词
ALTER TABLE "maps" ADD COLUMN IF NOT EXISTS "image_prompt_zh" TEXT;
ALTER TABLE "maps" ADD COLUMN IF NOT EXISTS "image_prompt_en" TEXT;

-- 添加地图元数据JSON字段（用于存储其他扩展信息）
ALTER TABLE "maps" ADD COLUMN IF NOT EXISTS "metadata" JSON DEFAULT '{}'::json;

-- 添加注释
COMMENT ON COLUMN "maps"."chapter" IS '章节编号：0=序章, 1=第一章, 2=第二章, 等等';
COMMENT ON COLUMN "maps"."min_level" IS '进入该地图所需的最低等级';
COMMENT ON COLUMN "maps"."world_x" IS '在世界地图上的X坐标（用于传送门位置）';
COMMENT ON COLUMN "maps"."world_y" IS '在世界地图上的Y坐标（用于传送门位置）';
COMMENT ON COLUMN "maps"."isometric_image" IS '等距图文件路径，如 /public/generated/maps/huashan_isometric.png';
COMMENT ON COLUMN "maps"."image_prompt_zh" IS '用于AI生成图片的中文提示词';
COMMENT ON COLUMN "maps"."image_prompt_en" IS '用于AI生成图片的英文提示词';
COMMENT ON COLUMN "maps"."metadata" IS '地图扩展元数据JSON，可存储任意额外信息';
