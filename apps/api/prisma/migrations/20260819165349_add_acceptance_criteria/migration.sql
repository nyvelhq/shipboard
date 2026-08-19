-- CreateTable
CREATE TABLE "acceptance_criteria" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acceptance_criteria_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "acceptance_criteria" ADD CONSTRAINT "acceptance_criteria_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
