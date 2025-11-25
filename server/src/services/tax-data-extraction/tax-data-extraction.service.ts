/**
 * Tax Data Extraction Service
 * Shared service for extracting structured tax data from document text using AI
 * Used by both the extract-tax-data tool and the tax calculation workflow
 */

import { z } from 'zod';
import { generateObject } from 'ai';
import { getOpenAiModel } from '@config/llm';
import { env } from '@config/env';

// Schema for extracted tax data
export const taxDataSchema = z.object({
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

export type TaxData = z.infer<typeof taxDataSchema>;

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
  // Check if we have any documents with text
  if (documents.length === 0 || documents.every(d => !d.extractedText)) {
    console.warn('[TaxDataExtraction] No documents with extracted text provided, returning zeros');
    return createEmptyTaxData();
  }

  // Combine all document texts
  const combinedText = documents
    .filter(doc => doc.extractedText && doc.extractedText.trim().length > 0)
    .map(doc => `=== ${doc.fileName} ===\n${doc.extractedText}`)
    .join('\n\n');

  if (combinedText.trim().length === 0) {
    console.warn('[TaxDataExtraction] Combined text is empty, returning zeros');
    return createEmptyTaxData();
  }

  // Truncate very large texts to prevent token limit issues
  const MAX_TEXT_LENGTH = 50000; // ~12k tokens, safe for most models
  const truncatedText = combinedText.length > MAX_TEXT_LENGTH
    ? combinedText.substring(0, MAX_TEXT_LENGTH) + '\n\n[... text truncated due to length ...]'
    : combinedText;

  console.log(`[TaxDataExtraction] Extracting from ${documents.length} documents, text length: ${truncatedText.length} chars (original: ${combinedText.length})`);

  // Build context from personal info
  let contextInfo = '';
  if (personalContext) {
    const parts = [];
    if (personalContext.canton) parts.push(`Canton: ${personalContext.canton}`);
    if (personalContext.taxYear) parts.push(`Tax Year: ${personalContext.taxYear}`);
    if (personalContext.numberOfChildren !== undefined) parts.push(`Children: ${personalContext.numberOfChildren}`);
    if (personalContext.maritalStatus) parts.push(`Marital Status: ${personalContext.maritalStatus}`);
    contextInfo = parts.length > 0 ? '\n\nPersonal Context:\n' + parts.join('\n') : '';
  }

  const prompt = `You are a Swiss tax document analyzer specialized in Canton Zurich taxation. Extract financial data from these documents and return structured JSON data in CHF (Swiss Francs).

Documents:
${truncatedText}${contextInfo}

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

  try {
    const model = getOpenAiModel();

    console.log(`[TaxDataExtraction] Using mode: ${env.LLM_GENERATE_MODE} (model: ${env.LLM_MODEL})`);

    const result = await generateObject({
      model,
      schema: taxDataSchema,
      prompt,
      mode: env.LLM_GENERATE_MODE, // Auto-selected based on model capabilities
    });

    console.log('[TaxDataExtraction] AI extraction completed successfully');
    console.log('[TaxDataExtraction] Extracted data:', JSON.stringify(result.object, null, 2));

    // Validate result is not null/undefined
    if (!result.object) {
      console.warn('[TaxDataExtraction] AI returned null/undefined, using empty data');
      return createEmptyTaxData();
    }

    return result.object;
  } catch (error: any) {
    console.error('[TaxDataExtraction] Error during AI extraction:', {
      error: error.message || error,
      type: error.constructor?.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines of stack
    });

    // Log more context for debugging
    console.error('[TaxDataExtraction] Context:', {
      documentCount: documents.length,
      textLength: truncatedText.length,
      hasPersonalContext: !!personalContext,
    });

    // Return empty data on error (graceful degradation)
    return createEmptyTaxData();
  }
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
