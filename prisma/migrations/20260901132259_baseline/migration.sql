-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AccountStatus" AS ENUM ('PENDING_EMAIL', 'PENDING_APPROVAL', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('REGISTRATION_SUBMITTED', 'REGISTRATION_BLOCKED_RATE_LIMIT', 'REGISTRATION_BLOCKED_DUPLICATE_RESULT', 'EMAIL_VERIFICATION_SENT', 'EMAIL_VERIFICATION_RESENT', 'EMAIL_VERIFIED', 'ACCOUNT_PENDING_APPROVAL', 'ACCOUNT_ACTIVATED', 'ACCOUNT_ACTIVATED_SKIP_EMAIL_VERIFICATION', 'ACCOUNT_DEACTIVATED', 'ACCOUNT_DELETED', 'ACCOUNT_ROLE_CHANGED', 'ACCOUNT_LOCKED_APPLICATION_NUMBER', 'ACCOUNT_LOCKED_RESULTS_VIEW_LIMIT', 'PROFILE_CORRECTED', 'PROFILE_EDIT_BLOCKED_DUPLICATE_RESULT', 'RESULTS_IMPORTED', 'RESULTS_RELINKED', 'LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'SETTINGS_CHANGED', 'DB_BACKUP_CREATED', 'DB_BACKUP_RESTORED', 'EMAIL_SEND_FAILED', 'EMAIL_SEND_SKIPPED_HOURLY_LIMIT');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'USER', 'STUDENT');

-- CreateTable
CREATE TABLE "public"."EmailSendLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSendLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventLog" (
    "id" TEXT NOT NULL,
    "type" "public"."EventType" NOT NULL,
    "message" TEXT NOT NULL,
    "actorEmail" TEXT,
    "actorUserId" TEXT,
    "targetEmail" TEXT,
    "targetUserId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RegistrationAttempt" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Results" (
    "id" TEXT NOT NULL,
    "practicalScore" INTEGER NOT NULL,
    "theoryScore" INTEGER NOT NULL,
    "finalScore" INTEGER NOT NULL,
    "oralScore" INTEGER NOT NULL,
    "writtenScore" INTEGER NOT NULL,
    "profession" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "pesel" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'STUDENT',
    "status" "public"."AccountStatus" NOT NULL DEFAULT 'PENDING_EMAIL',
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "peselDigits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "peselPositions" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "phone" TEXT,
    "resultId" TEXT,
    "applicationNumberAttempts" INTEGER NOT NULL DEFAULT 0,
    "resultsViewCount" INTEGER NOT NULL DEFAULT 0,
    "missingResultNotifiedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailSendLog_createdAt_idx" ON "public"."EmailSendLog"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "EventLog_actorUserId_idx" ON "public"."EventLog"("actorUserId" ASC);

-- CreateIndex
CREATE INDEX "EventLog_targetUserId_idx" ON "public"."EventLog"("targetUserId" ASC);

-- CreateIndex
CREATE INDEX "EventLog_type_createdAt_idx" ON "public"."EventLog"("type" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "RegistrationAttempt_ip_createdAt_idx" ON "public"."RegistrationAttempt"("ip" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_resultId_key" ON "public"."User"("resultId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token" ASC);

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "public"."Results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

