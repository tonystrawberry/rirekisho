-- CreateTable
CREATE TABLE "SharedCoverLetterLink" (
    "id" TEXT NOT NULL,
    "coverLetterId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#0f6e56',
    "data" JSONB NOT NULL,
    "sourceVersion" INTEGER NOT NULL,
    "status" "SharedLinkStatus" NOT NULL DEFAULT 'active',
    "label" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "SharedCoverLetterLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedCoverLetterLink_token_key" ON "SharedCoverLetterLink"("token");

-- CreateIndex
CREATE INDEX "SharedCoverLetterLink_coverLetterId_createdAt_idx" ON "SharedCoverLetterLink"("coverLetterId", "createdAt");

-- CreateIndex
CREATE INDEX "SharedCoverLetterLink_status_idx" ON "SharedCoverLetterLink"("status");

-- AddForeignKey
ALTER TABLE "SharedCoverLetterLink" ADD CONSTRAINT "SharedCoverLetterLink_coverLetterId_fkey" FOREIGN KEY ("coverLetterId") REFERENCES "CoverLetter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
