-- Add extraction metadata fields to TaskEngagementLetter table
-- Migration: 20260112_add_engagement_letter_extraction

BEGIN TRANSACTION;

-- Add Engagement Letter extraction fields
ALTER TABLE TaskEngagementLetter ADD elExtractionStatus NVARCHAR(20) NULL;
ALTER TABLE TaskEngagementLetter ADD elExtractionError NVARCHAR(MAX) NULL;
ALTER TABLE TaskEngagementLetter ADD elLetterDate DATETIME2 NULL;
ALTER TABLE TaskEngagementLetter ADD elLetterAge INT NULL;
ALTER TABLE TaskEngagementLetter ADD elSigningPartner NVARCHAR(100) NULL;
ALTER TABLE TaskEngagementLetter ADD elSigningPartnerCode NVARCHAR(10) NULL;
ALTER TABLE TaskEngagementLetter ADD elServicesCovered NVARCHAR(MAX) NULL;
ALTER TABLE TaskEngagementLetter ADD elHasPartnerSignature BIT NULL;
ALTER TABLE TaskEngagementLetter ADD elHasClientSignature BIT NULL;
ALTER TABLE TaskEngagementLetter ADD elHasTermsConditions BIT NULL;
ALTER TABLE TaskEngagementLetter ADD elHasTcPartnerSignature BIT NULL;
ALTER TABLE TaskEngagementLetter ADD elHasTcClientSignature BIT NULL;
ALTER TABLE TaskEngagementLetter ADD elExtractedText NVARCHAR(MAX) NULL;

-- Add DPA extraction fields
ALTER TABLE TaskEngagementLetter ADD dpaExtractionStatus NVARCHAR(20) NULL;
ALTER TABLE TaskEngagementLetter ADD dpaExtractionError NVARCHAR(MAX) NULL;
ALTER TABLE TaskEngagementLetter ADD dpaLetterDate DATETIME2 NULL;
ALTER TABLE TaskEngagementLetter ADD dpaLetterAge INT NULL;
ALTER TABLE TaskEngagementLetter ADD dpaSigningPartner NVARCHAR(100) NULL;
ALTER TABLE TaskEngagementLetter ADD dpaSigningPartnerCode NVARCHAR(10) NULL;
ALTER TABLE TaskEngagementLetter ADD dpaHasPartnerSignature BIT NULL;
ALTER TABLE TaskEngagementLetter ADD dpaHasClientSignature BIT NULL;
ALTER TABLE TaskEngagementLetter ADD dpaExtractedText NVARCHAR(MAX) NULL;

-- Add indexes for extraction status queries
CREATE INDEX idx_taskengagementletter_elextractionstatus ON TaskEngagementLetter(elExtractionStatus);
CREATE INDEX idx_taskengagementletter_dpaextractionstatus ON TaskEngagementLetter(dpaExtractionStatus);
CREATE INDEX idx_taskengagementletter_elletterdate ON TaskEngagementLetter(elLetterDate);
CREATE INDEX idx_taskengagementletter_dpaletterdate ON TaskEngagementLetter(dpaLetterDate);

COMMIT TRANSACTION;
