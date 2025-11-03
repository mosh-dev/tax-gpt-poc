import { SwissTaxData } from '../types';

/**
 * Mock Swiss tax data scenarios for testing
 */

// Scenario 1: Single employee in Zurich
export const mockEmployeeSingle: SwissTaxData = {
  personalInfo: {
    firstName: 'Anna',
    lastName: 'Müller',
    dateOfBirth: '1990-05-15',
    address: 'Bahnhofstrasse 100, 8001 Zürich',
    municipality: 'Zürich',
    maritalStatus: 'single',
  },
  income: {
    employment: 85000, // CHF per year
    investments: 1200,
    other: 0,
  },
  deductions: {
    professionalExpenses: 3500,
    healthcareExpenses: 2800,
    pillar3a: 7056, // Max contribution for 2024
    commuting: 2400,
    donations: 500,
  },
  wealth: {
    bankAccounts: 45000,
    securities: 25000,
    realEstate: 0,
  },
  taxYear: 2024,
};

// Scenario 2: Married couple with children
export const mockFamilyMarried: SwissTaxData = {
  personalInfo: {
    firstName: 'Thomas',
    lastName: 'Weber',
    dateOfBirth: '1985-03-22',
    address: 'Seestrasse 45, 8002 Zürich',
    municipality: 'Zürich',
    maritalStatus: 'married',
  },
  income: {
    employment: 120000, // Combined income
    rental: 18000,
    investments: 3500,
  },
  deductions: {
    professionalExpenses: 5000,
    healthcareExpenses: 4200,
    pillar3a: 14112, // Max for couple (both employed)
    childcare: 8000, // Two children
    commuting: 3000,
    donations: 1200,
  },
  wealth: {
    bankAccounts: 85000,
    securities: 120000,
    realEstate: 650000, // Own apartment
  },
  taxYear: 2024,
};

// Scenario 3: Self-employed freelancer
export const mockFreelancer: SwissTaxData = {
  personalInfo: {
    firstName: 'Marco',
    lastName: 'Rossi',
    dateOfBirth: '1988-11-08',
    address: 'Langstrasse 88, 8004 Zürich',
    municipality: 'Zürich',
    maritalStatus: 'divorced',
  },
  income: {
    selfEmployment: 95000,
    investments: 2200,
  },
  deductions: {
    professionalExpenses: 12000, // Higher for self-employed
    healthcareExpenses: 3600,
    pillar3a: 7056,
    education: 2500, // Professional development
    donations: 800,
  },
  wealth: {
    bankAccounts: 32000,
    securities: 18000,
  },
  taxYear: 2024,
};

/**
 * Get mock tax data by scenario
 */
export function getMockTaxData(scenario: 'single' | 'married' | 'freelancer' = 'single'): SwissTaxData {
  switch (scenario) {
    case 'married':
      return mockFamilyMarried;
    case 'freelancer':
      return mockFreelancer;
    case 'single':
    default:
      return mockEmployeeSingle;
  }
}

/**
 * Get list of all available scenarios
 */
export function getAvailableScenarios() {
  return [
    {
      id: 'single',
      name: 'Single Employee',
      description: 'Young professional, single, employed in Zurich',
      income: mockEmployeeSingle.income.employment,
    },
    {
      id: 'married',
      name: 'Married with Children',
      description: 'Married couple with rental income and children',
      income: mockFamilyMarried.income.employment,
    },
    {
      id: 'freelancer',
      name: 'Self-Employed Freelancer',
      description: 'Divorced freelancer with business expenses',
      income: mockFreelancer.income.selfEmployment,
    },
  ];
}
