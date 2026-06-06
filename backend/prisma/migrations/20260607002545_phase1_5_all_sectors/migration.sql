-- Phase 1-5: All Sectors — Bug Tracker, Time Tracking, SLA, Resource Allocation, Client Portal,
-- Tele-calling, Services, Stock Market/Advisory, Health, Custom Fields, SMS Logs

-- CreateEnum
CREATE TYPE "BugSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "BugStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'WONT_FIX', 'DUPLICATE');
CREATE TYPE "CallOutcome" AS ENUM ('CONNECTED', 'NO_ANSWER', 'BUSY', 'VOICEMAIL', 'WRONG_NUMBER', 'CALLBACK_REQUESTED', 'INTERESTED', 'NOT_INTERESTED', 'CONVERTED');
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "TradeCallStatus" AS ENUM ('ACTIVE', 'TARGET_HIT', 'STOP_LOSS', 'EXPIRED', 'CANCELLED');
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE "BloodGroup" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG', 'UNKNOWN');
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'URL', 'EMAIL');

-- AlterTable SupportTicket: add slaPolicyId
ALTER TABLE "SupportTicket" ADD COLUMN "slaPolicyId" TEXT;

-- CreateTable Bug
CREATE TABLE "Bug" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "BugSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "BugStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "reportedById" TEXT,
    "assignedToId" TEXT,
    "sprintId" TEXT,
    "stepsToRepro" TEXT,
    "expectedResult" TEXT,
    "actualResult" TEXT,
    "environment" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Bug_pkey" PRIMARY KEY ("id")
);

-- CreateTable BugComment
CREATE TABLE "BugComment" (
    "id" TEXT NOT NULL,
    "bugId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BugComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable ProjectTimeEntry
CREATE TABLE "ProjectTimeEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "userId" TEXT NOT NULL,
    "description" TEXT,
    "hours" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectTimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable GitCommit
CREATE TABLE "GitCommit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "author" TEXT,
    "authorEmail" TEXT,
    "branch" TEXT,
    "repoName" TEXT,
    "committedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GitCommit_pkey" PRIMARY KEY ("id")
);

-- CreateTable SLAPolicy
CREATE TABLE "SLAPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "firstResponseHours" INTEGER NOT NULL DEFAULT 4,
    "resolutionHours" INTEGER NOT NULL DEFAULT 24,
    "escalationHours" INTEGER,
    "appliesTo" TEXT NOT NULL DEFAULT 'SUPPORT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SLAPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable ResourceAllocation
CREATE TABLE "ResourceAllocation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT,
    "allocationPct" INTEGER NOT NULL DEFAULT 100,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ResourceAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable ClientPortalUser
CREATE TABLE "ClientPortalUser" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "partyId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClientPortalUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable CallLog
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT,
    "partyId" TEXT,
    "agentId" TEXT,
    "campaignId" TEXT,
    "phone" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "outcome" "CallOutcome",
    "duration" INTEGER,
    "notes" TEXT,
    "recordingUrl" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "calledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable CallScript
CREATE TABLE "CallScript" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "objections" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CallScript_pkey" PRIMARY KEY ("id")
);

-- CreateTable DNCEntry
CREATE TABLE "DNCEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "reason" TEXT,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DNCEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable DialerCampaign
CREATE TABLE "DialerCampaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scriptId" TEXT,
    "targetCount" INTEGER NOT NULL DEFAULT 0,
    "dialedCount" INTEGER NOT NULL DEFAULT 0,
    "connectedCount" INTEGER NOT NULL DEFAULT 0,
    "convertedCount" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DialerCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable ServiceCatalogItem
CREATE TABLE "ServiceCatalogItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'service',
    "deliveryDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable ServiceContract
CREATE TABLE "ServiceContract" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "partyId" TEXT,
    "serviceItemId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "value" DOUBLE PRECISION,
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "nextBillingDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "slaHours" INTEGER,
    "assignedToId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable KBArticle
CREATE TABLE "KBArticle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "notHelpful" INTEGER NOT NULL DEFAULT 0,
    "authorId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KBArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable InternalMessage
CREATE TABLE "InternalMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "threadId" TEXT,
    "message" TEXT NOT NULL,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InternalMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable AdvisoryPlan
CREATE TABLE "AdvisoryPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxAlerts" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdvisoryPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable AdvisorySubscription
CREATE TABLE "AdvisorySubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "partyId" TEXT,
    "planId" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "amount" DOUBLE PRECISION NOT NULL,
    "kycVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdvisorySubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable TradeCall
CREATE TABLE "TradeCall" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchange" TEXT,
    "callType" TEXT NOT NULL DEFAULT 'BUY',
    "segment" TEXT NOT NULL DEFAULT 'EQUITY',
    "entryPrice" DOUBLE PRECISION,
    "entryLow" DOUBLE PRECISION,
    "entryHigh" DOUBLE PRECISION,
    "targetPrice" DOUBLE PRECISION,
    "target2" DOUBLE PRECISION,
    "stopLoss" DOUBLE PRECISION,
    "riskReward" DOUBLE PRECISION,
    "status" "TradeCallStatus" NOT NULL DEFAULT 'ACTIVE',
    "rationale" TEXT,
    "outcome" DOUBLE PRECISION,
    "calledById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TradeCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable ResearchReport
CREATE TABLE "ResearchReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "symbol" TEXT,
    "reportType" TEXT NOT NULL DEFAULT 'EQUITY',
    "summary" TEXT,
    "content" TEXT,
    "rating" TEXT,
    "targetPrice" DOUBLE PRECISION,
    "currentPrice" DOUBLE PRECISION,
    "fileUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ResearchReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable KYCRecord
CREATE TABLE "KYCRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "partyId" TEXT,
    "panNumber" TEXT,
    "aadharNumber" TEXT,
    "bankAccount" TEXT,
    "ifscCode" TEXT,
    "bankName" TEXT,
    "dematAccount" TEXT,
    "dpId" TEXT,
    "riskProfile" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KYCRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable MarketAlert
CREATE TABLE "MarketAlert" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "alertType" TEXT NOT NULL DEFAULT 'PRICE',
    "condition" TEXT,
    "triggerValue" DOUBLE PRECISION,
    "message" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggeredAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable Patient
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientCode" TEXT,
    "name" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "gender" "Gender",
    "bloodGroup" "BloodGroup",
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "chronicConds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable PatientVisit
CREATE TABLE "PatientVisit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitType" TEXT NOT NULL DEFAULT 'OPD',
    "doctorId" TEXT,
    "chiefComplaint" TEXT,
    "diagnosis" TEXT,
    "vitalsBP" TEXT,
    "vitalsPulse" INTEGER,
    "vitalsTemp" DOUBLE PRECISION,
    "vitalsWeight" DOUBLE PRECISION,
    "vitalsHeight" DOUBLE PRECISION,
    "vitalsSpO2" INTEGER,
    "notes" TEXT,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PatientVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable Prescription
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "doctorId" TEXT,
    "medicines" JSONB NOT NULL DEFAULT '[]',
    "instructions" TEXT,
    "diet" TEXT,
    "followUpDays" INTEGER,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable LabReport
CREATE TABLE "LabReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "testName" TEXT NOT NULL,
    "testCategory" TEXT,
    "results" JSONB NOT NULL DEFAULT '{}',
    "normalRange" TEXT,
    "interpretation" TEXT,
    "technicianId" TEXT,
    "conductedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LabReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable CustomField
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldType" "CustomFieldType" NOT NULL DEFAULT 'TEXT',
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable CustomFieldValue
CREATE TABLE "CustomFieldValue" (
    "id" TEXT NOT NULL,
    "customFieldId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable SMSLog
CREATE TABLE "SMSLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'MSG91',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "providerId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "sentById" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SMSLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "Bug_organizationId_idx" ON "Bug"("organizationId");
CREATE INDEX "Bug_projectId_idx" ON "Bug"("projectId");
CREATE INDEX "Bug_organizationId_status_idx" ON "Bug"("organizationId", "status");
CREATE INDEX "Bug_assignedToId_idx" ON "Bug"("assignedToId");
CREATE INDEX "BugComment_bugId_idx" ON "BugComment"("bugId");
CREATE INDEX "ProjectTimeEntry_organizationId_idx" ON "ProjectTimeEntry"("organizationId");
CREATE INDEX "ProjectTimeEntry_projectId_idx" ON "ProjectTimeEntry"("projectId");
CREATE INDEX "ProjectTimeEntry_userId_idx" ON "ProjectTimeEntry"("userId");
CREATE INDEX "ProjectTimeEntry_date_idx" ON "ProjectTimeEntry"("date");
CREATE UNIQUE INDEX "GitCommit_projectId_sha_key" ON "GitCommit"("projectId", "sha");
CREATE INDEX "GitCommit_organizationId_idx" ON "GitCommit"("organizationId");
CREATE INDEX "GitCommit_projectId_idx" ON "GitCommit"("projectId");
CREATE INDEX "SLAPolicy_organizationId_idx" ON "SLAPolicy"("organizationId");
CREATE INDEX "ResourceAllocation_organizationId_idx" ON "ResourceAllocation"("organizationId");
CREATE INDEX "ResourceAllocation_projectId_idx" ON "ResourceAllocation"("projectId");
CREATE INDEX "ResourceAllocation_userId_idx" ON "ResourceAllocation"("userId");
CREATE UNIQUE INDEX "ClientPortalUser_organizationId_email_key" ON "ClientPortalUser"("organizationId", "email");
CREATE INDEX "ClientPortalUser_organizationId_idx" ON "ClientPortalUser"("organizationId");
CREATE INDEX "CallLog_organizationId_idx" ON "CallLog"("organizationId");
CREATE INDEX "CallLog_leadId_idx" ON "CallLog"("leadId");
CREATE INDEX "CallLog_agentId_idx" ON "CallLog"("agentId");
CREATE INDEX "CallLog_campaignId_idx" ON "CallLog"("campaignId");
CREATE INDEX "CallLog_calledAt_idx" ON "CallLog"("calledAt");
CREATE INDEX "CallScript_organizationId_idx" ON "CallScript"("organizationId");
CREATE UNIQUE INDEX "DNCEntry_organizationId_phone_key" ON "DNCEntry"("organizationId", "phone");
CREATE INDEX "DNCEntry_organizationId_idx" ON "DNCEntry"("organizationId");
CREATE INDEX "DialerCampaign_organizationId_idx" ON "DialerCampaign"("organizationId");
CREATE INDEX "DialerCampaign_organizationId_status_idx" ON "DialerCampaign"("organizationId", "status");
CREATE INDEX "ServiceCatalogItem_organizationId_idx" ON "ServiceCatalogItem"("organizationId");
CREATE INDEX "ServiceContract_organizationId_idx" ON "ServiceContract"("organizationId");
CREATE INDEX "ServiceContract_organizationId_status_idx" ON "ServiceContract"("organizationId", "status");
CREATE INDEX "ServiceContract_nextBillingDate_idx" ON "ServiceContract"("nextBillingDate");
CREATE UNIQUE INDEX "KBArticle_organizationId_slug_key" ON "KBArticle"("organizationId", "slug");
CREATE INDEX "KBArticle_organizationId_idx" ON "KBArticle"("organizationId");
CREATE INDEX "KBArticle_organizationId_isPublic_idx" ON "KBArticle"("organizationId", "isPublic");
CREATE INDEX "InternalMessage_organizationId_idx" ON "InternalMessage"("organizationId");
CREATE INDEX "InternalMessage_senderId_idx" ON "InternalMessage"("senderId");
CREATE INDEX "InternalMessage_recipientId_idx" ON "InternalMessage"("recipientId");
CREATE INDEX "InternalMessage_threadId_idx" ON "InternalMessage"("threadId");
CREATE INDEX "AdvisoryPlan_organizationId_idx" ON "AdvisoryPlan"("organizationId");
CREATE INDEX "AdvisorySubscription_organizationId_idx" ON "AdvisorySubscription"("organizationId");
CREATE INDEX "AdvisorySubscription_organizationId_status_idx" ON "AdvisorySubscription"("organizationId", "status");
CREATE INDEX "TradeCall_organizationId_idx" ON "TradeCall"("organizationId");
CREATE INDEX "TradeCall_organizationId_status_idx" ON "TradeCall"("organizationId", "status");
CREATE INDEX "TradeCall_symbol_idx" ON "TradeCall"("symbol");
CREATE INDEX "ResearchReport_organizationId_idx" ON "ResearchReport"("organizationId");
CREATE INDEX "ResearchReport_symbol_idx" ON "ResearchReport"("symbol");
CREATE UNIQUE INDEX "KYCRecord_organizationId_partyId_key" ON "KYCRecord"("organizationId", "partyId");
CREATE INDEX "KYCRecord_organizationId_idx" ON "KYCRecord"("organizationId");
CREATE INDEX "MarketAlert_organizationId_idx" ON "MarketAlert"("organizationId");
CREATE INDEX "MarketAlert_symbol_idx" ON "MarketAlert"("symbol");
CREATE INDEX "MarketAlert_isActive_idx" ON "MarketAlert"("isActive");
CREATE INDEX "Patient_organizationId_idx" ON "Patient"("organizationId");
CREATE INDEX "Patient_phone_idx" ON "Patient"("phone");
CREATE INDEX "PatientVisit_organizationId_idx" ON "PatientVisit"("organizationId");
CREATE INDEX "PatientVisit_patientId_idx" ON "PatientVisit"("patientId");
CREATE INDEX "PatientVisit_visitDate_idx" ON "PatientVisit"("visitDate");
CREATE INDEX "Prescription_organizationId_idx" ON "Prescription"("organizationId");
CREATE INDEX "Prescription_patientId_idx" ON "Prescription"("patientId");
CREATE INDEX "LabReport_organizationId_idx" ON "LabReport"("organizationId");
CREATE INDEX "LabReport_patientId_idx" ON "LabReport"("patientId");
CREATE UNIQUE INDEX "CustomField_organizationId_entity_fieldKey_key" ON "CustomField"("organizationId", "entity", "fieldKey");
CREATE INDEX "CustomField_organizationId_entity_idx" ON "CustomField"("organizationId", "entity");
CREATE UNIQUE INDEX "CustomFieldValue_customFieldId_entityId_key" ON "CustomFieldValue"("customFieldId", "entityId");
CREATE INDEX "CustomFieldValue_customFieldId_idx" ON "CustomFieldValue"("customFieldId");
CREATE INDEX "CustomFieldValue_entityId_idx" ON "CustomFieldValue"("entityId");
CREATE INDEX "SMSLog_organizationId_idx" ON "SMSLog"("organizationId");
CREATE INDEX "SMSLog_phone_idx" ON "SMSLog"("phone");
CREATE INDEX "SMSLog_createdAt_idx" ON "SMSLog"("createdAt");

-- AddForeignKey constraints
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_slaPolicyId_fkey" FOREIGN KEY ("slaPolicyId") REFERENCES "SLAPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Bug" ADD CONSTRAINT "Bug_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bug" ADD CONSTRAINT "Bug_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BugComment" ADD CONSTRAINT "BugComment_bugId_fkey" FOREIGN KEY ("bugId") REFERENCES "Bug"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTimeEntry" ADD CONSTRAINT "ProjectTimeEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTimeEntry" ADD CONSTRAINT "ProjectTimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GitCommit" ADD CONSTRAINT "GitCommit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GitCommit" ADD CONSTRAINT "GitCommit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SLAPolicy" ADD CONSTRAINT "SLAPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT "ResourceAllocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT "ResourceAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientPortalUser" ADD CONSTRAINT "ClientPortalUser_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CallScript" ADD CONSTRAINT "CallScript_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DNCEntry" ADD CONSTRAINT "DNCEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DialerCampaign" ADD CONSTRAINT "DialerCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceCatalogItem" ADD CONSTRAINT "ServiceCatalogItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceContract" ADD CONSTRAINT "ServiceContract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceContract" ADD CONSTRAINT "ServiceContract_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KBArticle" ADD CONSTRAINT "KBArticle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InternalMessage" ADD CONSTRAINT "InternalMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdvisoryPlan" ADD CONSTRAINT "AdvisoryPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdvisorySubscription" ADD CONSTRAINT "AdvisorySubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdvisorySubscription" ADD CONSTRAINT "AdvisorySubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AdvisoryPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TradeCall" ADD CONSTRAINT "TradeCall_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResearchReport" ADD CONSTRAINT "ResearchReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KYCRecord" ADD CONSTRAINT "KYCRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketAlert" ADD CONSTRAINT "MarketAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientVisit" ADD CONSTRAINT "PatientVisit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientVisit" ADD CONSTRAINT "PatientVisit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "PatientVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LabReport" ADD CONSTRAINT "LabReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LabReport" ADD CONSTRAINT "LabReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_customFieldId_fkey" FOREIGN KEY ("customFieldId") REFERENCES "CustomField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SMSLog" ADD CONSTRAINT "SMSLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
