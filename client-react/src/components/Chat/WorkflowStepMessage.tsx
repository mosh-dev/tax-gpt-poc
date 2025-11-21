/**
 * WorkflowStepMessage
 * Renders workflow steps as interactive chat messages
 */

import { useState, useEffect } from 'react';
import { Upload, Check, FileText } from 'lucide-react';
import type { WorkflowStatus, PersonalInfo, TaxDocument, ExtractedTaxData } from '../../types';
import { WORKFLOW_STEPS } from '../../constants';
import * as React from "react";

interface WorkflowStepMessageProps {
  workflow: WorkflowStatus;
  onSubmit: (stepId: string, data: any) => void;
  onUploadFiles: (files: File[]) => Promise<TaxDocument[]>;
  onCancel?: () => void;
  isSubmitting: boolean;
  onRender?: () => void; // Callback to notify parent that UI has rendered
}

export default function WorkflowStepMessage({
  workflow,
  onSubmit,
  onUploadFiles,
  onCancel,
  isSubmitting,
  onRender
}: WorkflowStepMessageProps) {
  const { currentStep, suspendPayload } = workflow;

  // Notify parent when component renders/updates
  useEffect(() => {
    onRender?.();
  }, [currentStep, onRender]);

  if (!currentStep) return null;

  switch (currentStep) {
    case WORKFLOW_STEPS.COLLECT_PERSONAL_INFO:
      return (
        <PersonalInfoForm
          payload={suspendPayload}
          onSubmit={(data) => onSubmit(currentStep, data)}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
        />
      );

    case WORKFLOW_STEPS.UPLOAD_DOCUMENTS:
      return (
        <DocumentUploadForm
          payload={suspendPayload}
          onSubmit={(data) => onSubmit(currentStep, data)}
          onUploadFiles={onUploadFiles}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
        />
      );

    case WORKFLOW_STEPS.REVIEW_EXTRACTED_DATA:
      return (
        <ReviewDataForm
          payload={suspendPayload}
          onCancel={onCancel}
          onSubmit={(data) => onSubmit(currentStep, data)}
          isSubmitting={isSubmitting}
        />
      );

    case WORKFLOW_STEPS.GENERATE_SUMMARY:
      return (
        <SummaryForm
          payload={suspendPayload}
          onSubmit={(data) => onSubmit(currentStep, data)}
          isSubmitting={isSubmitting}
        />
      );

    default:
      return (
        <div className="text-gray-500 text-sm">
          Unknown workflow step: {currentStep}
        </div>
      );
  }
}

// Personal Info Form
function PersonalInfoForm({
  payload,
  onSubmit,
  onCancel,
  isSubmitting
}: {
  payload: any;
  onSubmit: (data: PersonalInfo) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<PersonalInfo>({
    firstName: '',
    lastName: '',
    maritalStatus: 'single',
    numberOfChildren: 0,
    canton: 'zurich',
    taxYear: new Date().getFullYear(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-700 mb-4">{payload?.reason || 'Please provide your personal information:'}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
            <select
              value={formData.maritalStatus}
              onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value as PersonalInfo['maritalStatus'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Children</label>
            <input
              type="number"
              min="0"
              value={formData.numberOfChildren}
              onChange={(e) => setFormData({ ...formData, numberOfChildren: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Canton</label>
            <select
              value={formData.canton}
              onChange={(e) => setFormData({ ...formData, canton: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="zurich">Zürich</option>
              <option value="bern">Bern</option>
              <option value="geneva">Geneva</option>
              <option value="basel">Basel</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax Year</label>
            <input
              type="number"
              value={formData.taxYear}
              onChange={(e) => setFormData({ ...formData, taxYear: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Skip Workflow
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !formData.firstName || !formData.lastName}
            className={`${onCancel ? 'flex-1' : 'w-full'} bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Submitting...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Continue
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// Document Upload Form
function DocumentUploadForm({
  payload,
  onSubmit,
  onUploadFiles,
  onCancel,
  isSubmitting
}: {
  payload: any;
  onSubmit: (data: { documents: TaxDocument[] }) => void;
  onUploadFiles: (files: File[]) => Promise<TaxDocument[]>;
  onCancel?: () => void;
  isSubmitting: boolean;
}) {
  const [uploadedDocs, setUploadedDocs] = useState<TaxDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newDocs = await onUploadFiles(Array.from(files));
      setUploadedDocs(prev => [...prev, ...newDocs]);
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = () => {
    onSubmit({ documents: uploadedDocs });
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-700 mb-2">{payload?.reason || 'Please upload your tax documents:'}</p>

      {payload?.suggestedDocuments && (
        <div className="text-sm text-gray-600 mb-4">
          <p className="font-medium mb-1">Suggested documents:</p>
          <ul className="list-disc list-inside space-y-1">
            {payload.suggestedDocuments.map((doc: string, idx: number) => (
              <li key={idx}>{doc}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 mb-2">Drag & drop files here, or</p>
        <label className="cursor-pointer">
          <span className="text-primary-600 hover:text-primary-700 font-medium">browse files</span>
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </label>
        <p className="text-xs text-gray-500 mt-2">PDF, JPG, PNG up to 20MB</p>
      </div>

      {/* Uploaded files list */}
      {uploadedDocs.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Uploaded files:</p>
          {uploadedDocs.map((doc, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm">
              <FileText className="w-4 h-4" />
              <span>{doc.fileName}</span>
              <Check className="w-4 h-4 ml-auto" />
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
          Uploading...
        </div>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isSubmitting || uploading}
            className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Skip Workflow
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || uploading || uploadedDocs.length === 0}
          className={`${onCancel ? 'flex-1' : 'w-full'} bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2`}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processing...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Continue with {uploadedDocs.length} document{uploadedDocs.length !== 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Review Data Form
function ReviewDataForm({
  payload,
  onSubmit,
  onCancel,
  isSubmitting
}: {
  payload: any;
  onSubmit: (data: ExtractedTaxData) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<ExtractedTaxData>(
    payload?.extractedData || {
      income: { employment: 0, selfEmployment: 0, investments: 0, rental: 0, other: 0 },
      deductions: { professionalExpenses: 0, insurance: 0, pillar3a: 0, childcare: 0, education: 0, donations: 0, other: 0 },
      wealth: { bankAccounts: 0, securities: 0, realEstate: 0, vehicles: 0, other: 0 },
      confirmed: false,
    }
  );

  const handleSubmit = () => {
    onSubmit({ ...formData, confirmed: true });
  };

  const updateField = (category: 'income' | 'deductions' | 'wealth', field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-700 mb-4">{payload?.reason || 'Please review your extracted data:'}</p>

      {/* Income */}
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Income</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(formData.income).map(([key, value]) => (
            <div key={key}>
              <label className="block text-xs text-gray-600 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
              <input
                type="number"
                value={value}
                onChange={(e) => updateField('income', key, parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Deductions */}
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Deductions</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(formData.deductions).map(([key, value]) => (
            <div key={key}>
              <label className="block text-xs text-gray-600 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
              <input
                type="number"
                value={value}
                onChange={(e) => updateField('deductions', key, parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Wealth */}
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Wealth</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(formData.wealth).map(([key, value]) => (
            <div key={key}>
              <label className="block text-xs text-gray-600 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
              <input
                type="number"
                value={value}
                onChange={(e) => updateField('wealth', key, parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Skip Workflow
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`${onCancel ? 'flex-1' : 'w-full'} bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2`}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Calculating...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Confirm & Calculate
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Summary Form
function SummaryForm({
  payload,
  onSubmit,
  isSubmitting
}: {
  payload: any;
  onSubmit: (data: { generatePdf: boolean }) => void;
  isSubmitting: boolean;
}) {
  const calculation = payload?.calculation;

  if (!calculation) {
    return <div className="text-gray-500">No calculation data available.</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-700 mb-4">{payload?.reason || 'Your tax calculation summary:'}</p>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-xs text-gray-600">Gross Income</p>
          <p className="text-lg font-semibold text-gray-900">CHF {calculation.grossIncome?.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-xs text-gray-600">Total Deductions</p>
          <p className="text-lg font-semibold text-gray-900">CHF {calculation.totalDeductions?.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-xs text-gray-600">Taxable Income</p>
          <p className="text-lg font-semibold text-gray-900">CHF {calculation.taxableIncome?.toLocaleString()}</p>
        </div>
        <div className="bg-primary-50 p-3 rounded-lg">
          <p className="text-xs text-primary-600">Estimated Tax</p>
          <p className="text-lg font-semibold text-primary-700">CHF {calculation.estimatedTax?.toLocaleString()}</p>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        Effective tax rate: <span className="font-medium">{calculation.taxRate}%</span>
      </div>

      {/* Recommendations */}
      {calculation.recommendations && calculation.recommendations.length > 0 && (
        <div className="bg-yellow-50 p-3 rounded-lg">
          <p className="text-sm font-medium text-yellow-800 mb-2">Recommendations:</p>
          <ul className="text-sm text-yellow-700 space-y-1">
            {calculation.recommendations.map((rec: string, idx: number) => (
              <li key={idx}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onSubmit({ generatePdf: false })}
          disabled={isSubmitting}
          className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Finish
        </button>
        <button
          onClick={() => onSubmit({ generatePdf: true })}
          disabled={isSubmitting}
          className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generating...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Generate PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
}
