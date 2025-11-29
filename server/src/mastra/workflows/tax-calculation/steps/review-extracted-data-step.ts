import { createStep } from '@mastra/core/workflows';
import { WORKFLOW_STEPS } from '@shared/constants/workflow';
import { z } from 'zod';
import {
  taxCalculationWorkflowSchema
} from '@/mastra/workflows/tax-calculation/schemas/tax-calculation-workflow.schema';
import { DocumentWithText, extractTaxData } from '@domains/tax-extraction/tax-data-extraction.service';
import { injectFromContainer } from '@/app/di-container/container-helper';
import { MongoRepository } from '@infrastructure/database/base-repository';
import { AgentLoggerService } from '@infrastructure/ai/agent-logger.service';

/**
 * Step 3: Review Extracted Data
 * Expects documents to have been OCR'd by the process-documents tool (extractedText field populated).
 * This step internally uses AI to extract structured tax data from the OCR'd text.
 * No separate tool call needed - extraction happens within the workflow step itself.
 * Suspends to show extracted data and wait for user confirmation/corrections.
 */
export const reviewExtractedDataStep = createStep({
  id: WORKFLOW_STEPS.REVIEW_EXTRACTED_DATA,
  inputSchema: z.object({
    personalInfo: taxCalculationWorkflowSchema.personalInfoSchema,
    documents: taxCalculationWorkflowSchema.documentSchema.shape.documents,
  }),
  outputSchema: z.object({
    personalInfo: taxCalculationWorkflowSchema.personalInfoSchema,
    taxData: taxCalculationWorkflowSchema.extractedDataSchema,
  }),
  resumeSchema: taxCalculationWorkflowSchema.extractedDataSchema,
  suspendSchema: z.object({
    reason: z.string(),
    extractedData: taxCalculationWorkflowSchema.extractedDataSchema,
    canEdit: z.boolean(),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    const logger = injectFromContainer(AgentLoggerService);

    if (resumeData && resumeData.confirmed) {
      logger.info('[Workflow] Extracted data confirmed by user');
      return {
        personalInfo: inputData.personalInfo,
        taxData: resumeData,
      };
    }

    // Extract structured tax data from documents using AI
    // This happens internally in the workflow step - no separate tool call needed
    // The AI agent should have already called process-documents tool to OCR the files
    logger.info('[Workflow] Extracting tax data from documents using AI...');

    // Fetch latest OCR data from MongoDB (in case process-documents was called after workflow started)
    const documentsWithText: DocumentWithText[] = [];

    const mongoRepository = injectFromContainer(MongoRepository);

    for (const doc of inputData.documents) {
      // Try to get from workflow data first
      if (doc.extractedText && doc.extractedText.trim().length > 0) {
        documentsWithText.push({
          fileName: doc.fileName,
          extractedText: doc.extractedText,
        });
      } else {
        // Fetch from MongoDB in case it was processed after workflow started
        const fileMetadata = await mongoRepository.findFileById(doc.fileId);
        if (fileMetadata?.ocrResult?.text && fileMetadata.ocrResult.text.trim().length > 0) {
          logger.info(`[Workflow] Fetched OCR text from DB for: ${doc.fileName}`);
          documentsWithText.push({
            fileName: doc.fileName,
            extractedText: fileMetadata.ocrResult.text,
          });
        }
      }
    }

    if (documentsWithText.length === 0) {
      logger.error('[Workflow] No documents with extracted text found. Documents must be processed with OCR first.');

      // Return error payload that tells user/agent to process documents first
      const emptyData: z.infer<typeof taxCalculationWorkflowSchema.extractedDataSchema> = {
        income: { employment: 0, selfEmployment: 0, investments: 0, rental: 0, other: 0 },
        deductions: {
          professionalExpenses: 0,
          insurance: 0,
          pillar3a: 0,
          childcare: 0,
          education: 0,
          donations: 0,
          other: 0
        },
        wealth: { bankAccounts: 0, securities: 0, realEstate: 0, vehicles: 0, other: 0 },
        confirmed: false,
      };

      return await suspend({
        reason: 'Documents have not been processed with OCR yet. Please call process-documents tool on the uploaded files first, then resume the workflow. Cannot extract tax data without OCR text.',
        extractedData: emptyData,
        canEdit: true,
      });
    }

    logger.info(`[Workflow] Found ${documentsWithText.length} documents with text for extraction`);

    // Extract structured data using AI with personal info context
    // This uses the shared tax-data-extraction service internally
    const taxData = await extractTaxData(documentsWithText, {
      canton: inputData.personalInfo.canton,
      taxYear: inputData.personalInfo.taxYear,
      numberOfChildren: inputData.personalInfo.numberOfChildren,
      maritalStatus: inputData.personalInfo.maritalStatus,
    });

    const extractedData: z.infer<typeof taxCalculationWorkflowSchema.extractedDataSchema> = {
      ...taxData,
      confirmed: false,
    };

    logger.info('[Workflow] AI extraction completed, suspending for user review');
    return await suspend({
      reason: 'Please review the extracted data and make any corrections',
      extractedData,
      canEdit: true,
    });
  },
});
