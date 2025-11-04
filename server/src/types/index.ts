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
