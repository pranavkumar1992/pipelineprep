-- CreateEnum
CREATE TYPE "BankLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "PracticeMode" AS ENUM ('BANK', 'REVISION', 'FOCUS', 'MISTAKES', 'QUICK', 'MOCK');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('DARK', 'LIGHT');

-- CreateEnum
CREATE TYPE "WaitlistSource" AS ENUM ('DASHBOARD', 'PRICING', 'LANDING');

-- CreateEnum
CREATE TYPE "CareerFeature" AS ENUM ('RESUME_MAKER', 'JD_MATCH', 'AI_REVIEW');

-- CreateEnum
CREATE TYPE "WaitlistEvent" AS ENUM ('TEASER_VIEWED', 'NOTIFY_CLICKED', 'FEATURE_SELECTED');

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "level" "BankLevel";

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "mode" "PracticeMode" NOT NULL DEFAULT 'BANK';

-- CreateTable
CREATE TABLE "UserQuestionState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "timesSeen" INTEGER NOT NULL DEFAULT 0,
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,
    "consecutiveCorrect" INTEGER NOT NULL DEFAULT 0,
    "lastAnsweredAt" TIMESTAMP(3),
    "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
    "isHard" BOOLEAN NOT NULL DEFAULT false,
    "mastered" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuestionState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyChallenge" (
    "date" DATE NOT NULL,
    "questionId" TEXT NOT NULL,
    "scenarioId" TEXT,
    "pickedBy" TEXT
);

-- CreateTable
CREATE TABLE "DailyChallengeAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "selectedOption" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyChallengeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "longest" INTEGER NOT NULL DEFAULT 0,
    "activeDays" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" DATE,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyGoal" INTEGER NOT NULL DEFAULT 10,
    "theme" "Theme" NOT NULL DEFAULT 'DARK',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerWaitlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "features" "CareerFeature"[],
    "source" "WaitlistSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "CareerWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerTeaserEvent" (
    "id" TEXT NOT NULL,
    "type" "WaitlistEvent" NOT NULL,
    "userId" TEXT,
    "source" "WaitlistSource",
    "feature" "CareerFeature",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerTeaserEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserQuestionState_userId_isBookmarked_idx" ON "UserQuestionState"("userId", "isBookmarked");

-- CreateIndex
CREATE INDEX "UserQuestionState_userId_isHard_idx" ON "UserQuestionState"("userId", "isHard");

-- CreateIndex
CREATE INDEX "UserQuestionState_userId_mastered_idx" ON "UserQuestionState"("userId", "mastered");

-- CreateIndex
CREATE INDEX "UserQuestionState_userId_lastAnsweredAt_idx" ON "UserQuestionState"("userId", "lastAnsweredAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuestionState_userId_questionId_key" ON "UserQuestionState"("userId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallenge_date_key" ON "DailyChallenge"("date");

-- CreateIndex
CREATE INDEX "DailyChallenge_date_idx" ON "DailyChallenge"("date");

-- CreateIndex
CREATE INDEX "DailyChallengeAttempt_date_idx" ON "DailyChallengeAttempt"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallengeAttempt_userId_date_key" ON "DailyChallengeAttempt"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "UserStreak_userId_key" ON "UserStreak"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "DailyActivity_userId_date_idx" ON "DailyActivity"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyActivity_userId_date_key" ON "DailyActivity"("userId", "date");

-- CreateIndex
CREATE INDEX "CareerWaitlist_source_idx" ON "CareerWaitlist"("source");

-- CreateIndex
CREATE INDEX "CareerWaitlist_createdAt_idx" ON "CareerWaitlist"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CareerWaitlist_email_key" ON "CareerWaitlist"("email");

-- CreateIndex
CREATE INDEX "CareerTeaserEvent_type_idx" ON "CareerTeaserEvent"("type");

-- CreateIndex
CREATE INDEX "CareerTeaserEvent_createdAt_idx" ON "CareerTeaserEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Quiz_level_idx" ON "Quiz"("level");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_mode_idx" ON "QuizAttempt"("userId", "mode");

-- AddForeignKey
ALTER TABLE "UserQuestionState" ADD CONSTRAINT "UserQuestionState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuestionState" ADD CONSTRAINT "UserQuestionState_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChallenge" ADD CONSTRAINT "DailyChallenge_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChallenge" ADD CONSTRAINT "DailyChallenge_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChallengeAttempt" ADD CONSTRAINT "DailyChallengeAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChallengeAttempt" ADD CONSTRAINT "DailyChallengeAttempt_date_fkey" FOREIGN KEY ("date") REFERENCES "DailyChallenge"("date") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStreak" ADD CONSTRAINT "UserStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyActivity" ADD CONSTRAINT "DailyActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerWaitlist" ADD CONSTRAINT "CareerWaitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
