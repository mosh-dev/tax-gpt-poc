/**
 * Tax Data Extraction Service
 * Shared service for extracting structured tax data from document text using AI
 * Used by both the extract-tax-data tool and the tax calculation workflow
 */

import { z } from 'zod';
import { extractStructuredData } from '@domains/extraction/services/structured-extraction.service';
import { LoggerService } from '@infrastructure/logger/logger.service';
import { injectFromContainer } from '@/app/di-container/container-helper';

// Schema for extracted tax data
const taxDataSchema = z.object({
  income: z.object({
    employment: z.number().default(0).describe('Employment income (Bruttolohn, Salary)'),
    selfEmployment: z.number().default(0).describe('Self-employment income'),
    investments: z.number().default(0).describe('Investment income (Zinsen, Dividenden, Interest)'),
    rental: z.number().default(0).describe('Rental income (Mieteinnahmen)'),
    other: z.number().default(0).describe('Other income'),
  }).describe('Income sources in CHF'),
  deductions: z.object({
    professionalExpenses: z.number().default(0).describe('Professional expenses (Berufsauslagen, Spesen)'),
    insurance: z.number().default(0).describe('Insurance premiums (Versicherungsprämien)'),
    pillar3a: z.number().default(0).describe('Pillar 3a contributions (Säule 3a)'),
    childcare: z.number().default(0).describe('Childcare expenses (Kinderbetreuung)'),
    education: z.number().default(0).describe('Education expenses (Ausbildungskosten)'),
    donations: z.number().default(0).describe('Donations (Spenden)'),
    other: z.number().default(0).describe('Other deductions'),
  }).describe('Deductions in CHF'),
  wealth: z.object({
    bankAccounts: z.number().default(0).describe('Bank account balances (Bankguthaben)'),
    securities: z.number().default(0).describe('Securities value (Wertschriften)'),
    realEstate: z.number().default(0).describe('Real estate value (Immobilien)'),
    vehicles: z.number().default(0).describe('Vehicle value (Fahrzeuge)'),
    other: z.number().default(0).describe('Other wealth'),
  }).describe('Wealth in CHF'),
});

type TaxData = z.infer<typeof taxDataSchema>;

export interface PersonalContext {
  canton?: string;
  taxYear?: number;
  numberOfChildren?: number;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
}

export interface DocumentWithText {
  fileName: string;
  extractedText: string;
}

/**
 * Extract structured tax data from document texts using AI
 * @param documents Array of documents with extracted text
 * @param personalContext Optional personal information for context
 * @returns Extracted tax data matching taxDataSchema
 */
export async function extractTaxData(
  documents: DocumentWithText[],
  personalContext?: PersonalContext
): Promise<TaxData> {

  const logger = injectFromContainer(LoggerService);

  if (documents.length === 0 || documents.every(d => !d.extractedText)) {
    logger.warn('[TaxDataExtraction] No documents with extracted text provided, returning zeros');
    return createEmptyTaxData();
  }

  const documentTexts = documents
    .filter(doc => doc.extractedText && doc.extractedText.trim().length > 0)
    .map(doc => `=== ${doc.fileName} ===\n${doc.extractedText}`);

  if (documentTexts.length === 0) {
    logger.warn('[TaxDataExtraction] Combined text is empty, returning zeros');
    return createEmptyTaxData();
  }

  logger.log(`[TaxDataExtraction] Extracting from ${documents.length} documents`);

  const systemPrompt = buildSwissTaxPrompt(personalContext);

  try {
    const result = await extractStructuredData(
      { text: documentTexts, context: personalContext },
      taxDataSchema,
      {
        maxTokens: 12000,
        systemPrompt,
        useCache: true
      }
    );

    logger.log('[TaxDataExtraction] AI extraction completed successfully');
    logger.log(result, '[TaxDataExtraction] Extracted data');

    return result;
  } catch (error: any) {
    logger.error({
      error: error.message || error,
      type: error.constructor?.name,
    },'[TaxDataExtraction] Error during AI extraction:');

    logger.error({
      documentCount: documents.length,
      hasPersonalContext: !!personalContext,
    },'[TaxDataExtraction] Context:');

    return createEmptyTaxData();
  }
}

function buildSwissTaxPrompt(personalContext?: PersonalContext): string {
  let contextInfo = '';
  if (personalContext) {
    const parts = [];
    if (personalContext.canton) parts.push(`Canton: ${personalContext.canton}`);
    if (personalContext.taxYear) parts.push(`Tax Year: ${personalContext.taxYear}`);
    if (personalContext.numberOfChildren !== undefined) parts.push(`Children: ${personalContext.numberOfChildren}`);
    if (personalContext.maritalStatus) parts.push(`Marital Status: ${personalContext.maritalStatus}`);
    contextInfo = parts.length > 0 ? '\n\nPersonal Context:\n' + parts.join('\n') : '';
  }

  return `You are a Swiss tax document analyzer specialized in Canton Zurich taxation. Extract financial data from these documents and return structured JSON data in CHF (Swiss Francs).${contextInfo}

EXTRACTION RULES:
1. Look for these SWISS TAX TERMS and map them:

   INCOME (Einkommen):
   - "Bruttolohn", "Jahresbruttolohn", "Salary", "Gehalt", "Lohn" → employment
   - "Selbständig erwerbstätig", "Self-employed", "Geschäftseinkommen" → selfEmployment
   - "Zinsen", "Dividenden", "Kapitalertrag", "Interest", "Dividends" → investments
   - "Mieteinnahmen", "Rental income", "Vermietung" → rental
   - Other income sources → other

   DEDUCTIONS (Abzüge):
   - "Berufsauslagen", "Berufskosten", "Spesen", "Professional expenses", "Fahrtkosten" → professionalExpenses
   - "Versicherungsprämien", "Krankenversicherung", "Insurance premiums", "Health insurance" → insurance
   - "Säule 3a", "Pillar 3a", "3. Säule", "Vorsorge" → pillar3a
   - "Kinderbetreuung", "Kindertagesstätte", "Childcare", "Daycare" → childcare
   - "Ausbildungskosten", "Weiterbildung", "Education", "Training" → education
   - "Spenden", "Donations", "Zuwendungen" → donations
   - Other deductions → other

   WEALTH (Vermögen):
   - "Bankguthaben", "Kontoguthaben", "Bank account", "Savings" → bankAccounts
   - "Wertschriften", "Aktien", "Obligationen", "Securities", "Stocks", "Bonds" → securities
   - "Immobilien", "Liegenschaft", "Grundstück", "Real estate", "Property" → realEstate
   - "Fahrzeuge", "Auto", "Motorfahrzeug", "Vehicles", "Car" → vehicles
   - Other wealth → other

2. AMOUNT EXTRACTION:
   - Extract amounts in CHF (Swiss Francs)
   - Handle Swiss number format: 85'000.50 or 85,000.50
   - If amount is per month, multiply by 12 for annual
   - Remove currency symbols (CHF, Fr., SFr.)
   - Use 0 if no value found for a field

3. CONTEXT AWARENESS:
   - Tax year matters for contribution limits (e.g., Pillar 3a max)
   - Children count affects childcare expectations
   - Married vs single affects joint income recognition

4. RETURN ONLY NUMERIC VALUES (no formatting, no currency symbols)

Extract all relevant financial data and return a structured JSON object. Use 0 for fields with no information.`;
}

/**
 * Create an empty tax data object with all zeros
 */
function createEmptyTaxData(): TaxData {
  return {
    income: {
      employment: 0,
      selfEmployment: 0,
      investments: 0,
      rental: 0,
      other: 0,
    },
    deductions: {
      professionalExpenses: 0,
      insurance: 0,
      pillar3a: 0,
      childcare: 0,
      education: 0,
      donations: 0,
      other: 0,
    },
    wealth: {
      bankAccounts: 0,
      securities: 0,
      realEstate: 0,
      vehicles: 0,
      other: 0,
    },
  };
}
