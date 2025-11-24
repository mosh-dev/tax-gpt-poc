/**
 * Employee Seed Script
 * Seeds the database with mock employee/tax data
 */

import { Employee } from '@models';
import { SwissTaxData } from '@/types';
import { EmployeeData } from '@models/employee.model';

// Scenario 1: Single employee in Zurich
const mockEmployeeSingle: SwissTaxData = {
  personalInfo: {
    firstName: 'Anna',
    lastName: 'Müller',
    dateOfBirth: '1990-05-15',
    address: 'Bahnhofstrasse 100, 8001 Zürich',
    municipality: 'Zürich',
    maritalStatus: 'single',
  },
  income: {
    employment: 85000,
    investments: 1200,
    other: 0,
  },
  deductions: {
    professionalExpenses: 3500,
    healthcareExpenses: 2800,
    pillar3a: 7056,
    commuting: 2400,
    donations: 500,
  },
  wealth: {
    bankAccounts: 45000,
    securities: 25000,
    realEstate: 0,
  },
  taxYear: 2025,
};

// Scenario 2: Married couple with children
const mockFamilyMarried: SwissTaxData = {
  personalInfo: {
    firstName: 'Thomas',
    lastName: 'Weber',
    dateOfBirth: '1985-03-22',
    address: 'Seestrasse 45, 8002 Zürich',
    municipality: 'Zürich',
    maritalStatus: 'married',
  },
  income: {
    employment: 120000,
    rental: 18000,
    investments: 3500,
  },
  deductions: {
    professionalExpenses: 5000,
    healthcareExpenses: 4200,
    pillar3a: 14112,
    childcare: 8000,
    commuting: 3000,
    donations: 1200,
  },
  wealth: {
    bankAccounts: 85000,
    securities: 120000,
    realEstate: 650000,
  },
  taxYear: 2025,
};

// Scenario 3: Self-employed freelancer
const mockFreelancer: SwissTaxData = {
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
    professionalExpenses: 12000,
    healthcareExpenses: 3600,
    pillar3a: 7056,
    education: 2500,
    donations: 800,
  },
  wealth: {
    bankAccounts: 32000,
    securities: 18000,
  },
  taxYear: 2025,
};

// Scenario 4: Retiree with pension income
const mockRetiree: SwissTaxData = {
  personalInfo: {
    firstName: 'Elisabeth',
    lastName: 'Schneider',
    dateOfBirth: '1958-09-12',
    address: 'Rämistrasse 71, 8006 Zürich',
    municipality: 'Zürich',
    maritalStatus: 'widowed',
  },
  income: {
    other: 72000, // AHV + Pension
    investments: 8500,
    rental: 24000,
  },
  deductions: {
    healthcareExpenses: 6200,
    donations: 3000,
  },
  wealth: {
    bankAccounts: 180000,
    securities: 350000,
    realEstate: 850000,
  },
  taxYear: 2025,
};

// Scenario 5: Young professional starting career
const mockYoungProfessional: SwissTaxData = {
  personalInfo: {
    firstName: 'Luca',
    lastName: 'Bernasconi',
    dateOfBirth: '1998-02-28',
    address: 'Hardturmstrasse 161, 8005 Zürich',
    municipality: 'Zürich',
    maritalStatus: 'single',
  },
  income: {
    employment: 62000,
    other: 500, // Side income
  },
  deductions: {
    professionalExpenses: 2000,
    healthcareExpenses: 1800,
    pillar3a: 3500,
    commuting: 1200,
    education: 4000,
  },
  wealth: {
    bankAccounts: 12000,
    securities: 5000,
  },
  taxYear: 2025,
};

// All employee seed data
const employeeSeedData: EmployeeData[] = [
  {
    scenarioId: 'single',
    scenarioName: 'Single Employee',
    scenarioDescription: 'Young professional, single, employed in Zurich with moderate income',
    taxData: mockEmployeeSingle,
    isActive: true,
  },
  {
    scenarioId: 'married',
    scenarioName: 'Married with Children',
    scenarioDescription: 'Married couple with rental income, children, and property ownership',
    taxData: mockFamilyMarried,
    isActive: true,
  },
  {
    scenarioId: 'freelancer',
    scenarioName: 'Self-Employed Freelancer',
    scenarioDescription: 'Divorced freelancer with business expenses and professional development costs',
    taxData: mockFreelancer,
    isActive: true,
  },
  {
    scenarioId: 'retiree',
    scenarioName: 'Retiree',
    scenarioDescription: 'Widowed retiree with pension income, rental property, and substantial wealth',
    taxData: mockRetiree,
    isActive: true,
  },
  {
    scenarioId: 'young-professional',
    scenarioName: 'Young Professional',
    scenarioDescription: 'Entry-level employee starting career with education expenses and growing savings',
    taxData: mockYoungProfessional,
    isActive: true,
  },
];

/**
 * Seed employees to database
 * Uses upsert to avoid duplicates
 */
export async function seedEmployees(): Promise<void> {
  console.log('[Seed] Starting employee data seeding...');

  let created = 0;
  let updated = 0;

  for (const employeeData of employeeSeedData) {
    const result = await Employee.findOneAndUpdate(
      { scenarioId: employeeData.scenarioId },
      employeeData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Check if it was an insert or update
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      updated++;
    }
  }

  console.log(`[Seed] Employee seeding complete: ${created} created, ${updated} updated`);
}

/**
 * Get all seeded employees
 */
export async function getSeededEmployees() {
  return Employee.find({ isActive: true }).sort({ scenarioId: 1 });
}

/**
 * Get employee by scenario ID
 */
export async function getEmployeeByScenarioId(scenarioId: string) {
  return Employee.findOne({ scenarioId, isActive: true });
}

export { employeeSeedData };
