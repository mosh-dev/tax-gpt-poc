/**
 * Employee Model
 * Stores employee data with their Swiss tax information
 */

import mongoose, { Document, Schema } from 'mongoose';
import { SwissTaxData } from '@domains/tax-extraction/swiss-tax-data.model';

export interface IEmployee extends Document {
  scenarioId: string; // 'single', 'married', 'freelancer', etc.
  scenarioName: string;
  scenarioDescription: string;
  taxData: SwissTaxData;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeData {
  scenarioId: string;
  scenarioName: string;
  scenarioDescription: string;
  taxData: SwissTaxData;
  isActive?: boolean;
}

const PersonalInfoSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  dateOfBirth: { type: String, required: true },
  address: { type: String, required: true },
  municipality: { type: String, required: true },
  maritalStatus: {
    type: String,
    enum: ['single', 'married', 'divorced', 'widowed'],
    required: true
  },
}, { _id: false });

const IncomeSchema = new Schema({
  employment: { type: Number },
  selfEmployment: { type: Number },
  investments: { type: Number },
  rental: { type: Number },
  other: { type: Number },
}, { _id: false });

const DeductionsSchema = new Schema({
  professionalExpenses: { type: Number },
  healthcareExpenses: { type: Number },
  pillar3a: { type: Number },
  childcare: { type: Number },
  education: { type: Number },
  commuting: { type: Number },
  donations: { type: Number },
}, { _id: false });

const WealthSchema = new Schema({
  bankAccounts: { type: Number },
  securities: { type: Number },
  realEstate: { type: Number },
  other: { type: Number },
}, { _id: false });

const TaxDataSchema = new Schema({
  personalInfo: { type: PersonalInfoSchema, required: true },
  income: { type: IncomeSchema, required: true },
  deductions: { type: DeductionsSchema, required: true },
  wealth: { type: WealthSchema, required: true },
  taxYear: { type: Number, required: true },
}, { _id: false });

const EmployeeSchema = new Schema<IEmployee>({
  scenarioId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  scenarioName: { type: String, required: true },
  scenarioDescription: { type: String, required: true },
  taxData: { type: TaxDataSchema, required: true },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

// Index for faster queries
EmployeeSchema.index({ isActive: 1 });
EmployeeSchema.index({ 'taxData.taxYear': 1 });

export const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);
