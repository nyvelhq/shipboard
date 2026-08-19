-- DropForeignKey
ALTER TABLE "task_tags" DROP CONSTRAINT "task_tags_tag_id_fkey";

-- AddForeignKey
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
