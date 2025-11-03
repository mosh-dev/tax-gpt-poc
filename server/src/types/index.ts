/**
 * Message in a conversation
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

/**
 * Chat request from client
 */
export interface ChatRequest {
  message: string;
  conversationHistory?: Message[];
  userId?: string;
}

/**
 * Chat response to client
 */
export interface ChatResponse {
  success: boolean;
  message?: string;
  error?: string;
  timestamp: string;
}

/**
 * Swiss tax data structure
 */
export interface SwissTaxData {
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    address: string;
    municipality: string;
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  };
  income: {
    employment?: number; // Lohnausweis
    selfEmployment?: number;
    investments?: number;
    rental?: number;
    other?: number;
  };
  deductions: {
    professionalExpenses?: number;
    healthcareExpenses?: number;
    pillar3a?: number; // Pension contributions
    childcare?: number;
    education?: number;
    commuting?: number;
    donations?: number;
  };
  wealth: {
    bankAccounts?: number;
    securities?: number;
    realEstate?: number;
    other?: number;
  };
  taxYear: number;
}

/**
 * PDF extraction result
 */
export interface PDFExtraction {
  success: boolean;
  text?: string;
  numPages?: number;
  error?: string;
  fileName: string;
  extractedData?: Partial<SwissTaxData>;
}

/**
 * Tax form generation request
 */
export interface TaxFormRequest {
  taxData: SwissTaxData;
  formType: 'summary' | 'full' | 'recommendations';
}

/**
 * Tax form generation response
 */
export interface TaxFormResponse {
  success: boolean;
  content?: string;
  error?: string;
  timestamp: string;
}
