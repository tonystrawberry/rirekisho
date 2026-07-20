-- AlterTable
ALTER TABLE "CoverLetter" ADD COLUMN     "contentVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "selectedLocale" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "sourceLocale" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "subject" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "CoverLetterLocalePresentation" (
    "id" TEXT NOT NULL,
    "coverLetterId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "sourceVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverLetterLocalePresentation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoverLetterLocalePresentation_coverLetterId_locale_key" ON "CoverLetterLocalePresentation"("coverLetterId", "locale");

-- AddForeignKey
ALTER TABLE "CoverLetterLocalePresentation" ADD CONSTRAINT "CoverLetterLocalePresentation_coverLetterId_fkey" FOREIGN KEY ("coverLetterId") REFERENCES "CoverLetter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
