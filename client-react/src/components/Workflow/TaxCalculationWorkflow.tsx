/**
 * Tax Calculation Workflow Component
 * Multi-step workflow with human-in-the-loop for tax calculation
 */

import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import type { WorkflowStatus, PersonalInfo, TaxDocument, ExtractedTaxData } from '../../types';

interface TaxCalculationWorkflowProps {
  threadId: string;
  onComplete?: (result: any) => void;
  onCancel?: () => void;
}

// Step names to display names mapping
const STEP_NAMES: Record<string, string> = {
  'collect-personal-info': 'Personal Information',
  'upload-documents': 'Upload Documents',
  'review-extracted-data': 'Review Data',
  'calculate-tax': 'Calculate Tax',
  'generate-summary': 'Summary',
};

export default function TaxCalculationWorkflow({
  threadId,
  onComplete,
  onCancel,
}: TaxCalculationWorkflowProps) {
  const [workflow, setWorkflow] = useState<WorkflowStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start workflow on mount
  useEffect(() => {
    startWorkflow();
  }, [threadId]);

  const startWorkflow = async () => {
    setLoading(true);
    setError(null);

    try {
      const status = await apiService.startTaxCalculationWorkflow(threadId);
      setWorkflow(status);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resumeWorkflow = async (data: any) => {
    if (!workflow) return;

    setLoading(true);
    setError(null);

    try {
      const status = await apiService.resumeWorkflow(
        workflow.runId,
        workflow.currentStep!,
        data
      );
      setWorkflow(status);

      if (status.status === 'completed' && onComplete) {
        onComplete(status.result);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (workflow) {
      try {
        await apiService.cancelWorkflow(workflow.runId);
      } catch (err) {
        console.error('Failed to cancel workflow:', err);
      }
    }
    onCancel?.();
  };

  if (loading && !workflow) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Starting tax calculation...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold mb-2">Error</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={startWorkflow}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!workflow) return null;

  // Render based on workflow status
  if (workflow.status === 'completed') {
    return (
      <CompletedStep
        result={workflow.result}
        onClose={() => onComplete?.(workflow.result)}
      />
    );
  }

  if (workflow.status === 'failed') {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold mb-2">Workflow Failed</h3>
        <p className="text-red-600">{workflow.error}</p>
      </div>
    );
  }

  // Render current suspended step
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Progress Header */}
      <WorkflowProgress currentStep={workflow.currentStep} />

      {/* Step Content */}
      <div className="p-6">
        {workflow.currentStep === 'collect-personal-info' && (
          <PersonalInfoStep
            payload={workflow.suspendPayload}
            onSubmit={resumeWorkflow}
            onCancel={handleCancel}
            loading={loading}
          />
        )}

        {workflow.currentStep === 'upload-documents' && (
          <DocumentUploadStep
            payload={workflow.suspendPayload}
            threadId={threadId}
            onSubmit={resumeWorkflow}
            onCancel={handleCancel}
            loading={loading}
          />
        )}

        {workflow.currentStep === 'review-extracted-data' && (
          <ReviewDataStep
            payload={workflow.suspendPayload}
            onSubmit={resumeWorkflow}
            onCancel={handleCancel}
            loading={loading}
          />
        )}

        {workflow.currentStep === 'generate-summary' && (
          <SummaryStep
            payload={workflow.suspendPayload}
            onSubmit={resumeWorkflow}
            onCancel={handleCancel}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}

// === Progress Indicator ===

function WorkflowProgress({ currentStep }: { currentStep?: string }) {
  const steps = [
    'collect-personal-info',
    'upload-documents',
    'review-extracted-data',
    'calculate-tax',
    'generate-summary',
  ];

  const currentIndex = steps.indexOf(currentStep || '');

  return (
    <div className="bg-gray-50 px-6 py-4 border-b">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index < currentIndex
                  ? 'bg-green-500 text-white'
                  : index === currentIndex
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index < currentIndex ? '✓' : index + 1}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-1 mx-2 ${
                  index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 text-center">
        <span className="text-sm font-medium text-gray-700">
          {STEP_NAMES[currentStep || ''] || 'Processing...'}
        </span>
      </div>
    </div>
  );
}

// === Step Components ===

interface StepProps {
  payload: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
}

function PersonalInfoStep({ payload, onSubmit, onCancel, loading }: StepProps) {
  const [formData, setFormData] = useState<PersonalInfo>({
    firstName: '',
    lastName: '',
    maritalStatus: 'single',
    numberOfChildren: 0,
    canton: 'zurich',
    taxYear: new Date().getFullYear() - 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {payload?.reason || 'Enter your personal information'}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name *
          </label>
          <input
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Marital Status *
          </label>
          <select
            value={formData.maritalStatus}
            onChange={(e) =>
              setFormData({ ...formData, maritalStatus: e.target.value as any })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Children
          </label>
          <input
            type="number"
            min="0"
            value={formData.numberOfChildren}
            onChange={(e) =>
              setFormData({ ...formData, numberOfChildren: parseInt(e.target.value) || 0 })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tax Year *
          </label>
          <input
            type="number"
            required
            value={formData.taxYear}
            onChange={(e) =>
              setFormData({ ...formData, taxYear: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Canton
          </label>
          <select
            value={formData.canton}
            onChange={(e) => setFormData({ ...formData, canton: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="zurich">Zurich</option>
            <option value="bern">Bern</option>
            <option value="geneva">Geneva</option>
            <option value="basel">Basel</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </form>
  );
}

function DocumentUploadStep({
  payload,
  threadId,
  onSubmit,
  onCancel,
  loading,
}: StepProps & { threadId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<TaxDocument[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploaded = await apiService.uploadFiles(files, threadId);
      const docs: TaxDocument[] = uploaded.map((f) => ({
        fileId: f.fileId,
        fileName: f.originalName,
        fileType: f.mimeType,
      }));
      setUploadedDocs([...uploadedDocs, ...docs]);
      setFiles([]);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    onSubmit({ documents: uploadedDocs });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {payload?.reason || 'Upload your tax documents'}
      </h3>

      {payload?.suggestedDocuments && (
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="text-sm font-medium text-blue-800 mb-2">Suggested documents:</p>
          <ul className="text-sm text-blue-700 list-disc list-inside">
            {payload.suggestedDocuments.map((doc: string, i: number) => (
              <li key={i}>{doc}</li>
            ))}
          </ul>
        </div>
      )}

      {/* File Input */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer text-primary-600 hover:text-primary-700"
        >
          Click to select files
        </label>
        <p className="text-sm text-gray-500 mt-1">
          Accepted: PDF, JPG, PNG, TIFF, BMP
        </p>
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Selected files:</p>
          {files.map((file, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded">
              <span className="text-sm">{file.name}</span>
              <span className="text-xs text-gray-500">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </div>
          ))}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2 bg-gray-800 text-white rounded hover:bg-gray-900 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>
      )}

      {/* Uploaded Documents */}
      {uploadedDocs.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Uploaded documents:</p>
          {uploadedDocs.map((doc) => (
            <div
              key={doc.fileId}
              className="flex items-center gap-2 bg-green-50 p-2 rounded"
            >
              <span className="text-green-600">✓</span>
              <span className="text-sm">{doc.fileName}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || uploadedDocs.length === 0}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

function ReviewDataStep({ payload, onSubmit, onCancel, loading }: StepProps) {
  const [data, setData] = useState<ExtractedTaxData>(
    payload?.extractedData || {
      income: { employment: 0, selfEmployment: 0, investments: 0, rental: 0, other: 0 },
      deductions: {
        professionalExpenses: 0,
        insurance: 0,
        pillar3a: 0,
        childcare: 0,
        education: 0,
        donations: 0,
        other: 0,
      },
      wealth: { bankAccounts: 0, securities: 0, realEstate: 0, vehicles: 0, other: 0 },
      confirmed: false,
    }
  );

  const handleSubmit = () => {
    onSubmit({ ...data, confirmed: true });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        {payload?.reason || 'Review extracted data'}
      </h3>

      {/* Income Section */}
      <div>
        <h4 className="font-medium text-gray-800 mb-2">Income</h4>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(data.income).map(([key, value]) => (
            <div key={key}>
              <label className="block text-xs text-gray-600 mb-1 capitalize">
                {key.replace(/([A-Z])/g, ' $1')}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) =>
                  setData({
                    ...data,
                    income: { ...data.income, [key]: parseInt(e.target.value) || 0 },
                  })
                }
                className="w-full px-2 py-1 text-sm border rounded"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Deductions Section */}
      <div>
        <h4 className="font-medium text-gray-800 mb-2">Deductions</h4>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(data.deductions).map(([key, value]) => (
            <div key={key}>
              <label className="block text-xs text-gray-600 mb-1 capitalize">
                {key.replace(/([A-Z])/g, ' $1')}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) =>
                  setData({
                    ...data,
                    deductions: {
                      ...data.deductions,
                      [key]: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="w-full px-2 py-1 text-sm border rounded"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Wealth Section */}
      <div>
        <h4 className="font-medium text-gray-800 mb-2">Wealth</h4>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(data.wealth).map(([key, value]) => (
            <div key={key}>
              <label className="block text-xs text-gray-600 mb-1 capitalize">
                {key.replace(/([A-Z])/g, ' $1')}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) =>
                  setData({
                    ...data,
                    wealth: { ...data.wealth, [key]: parseInt(e.target.value) || 0 },
                  })
                }
                className="w-full px-2 py-1 text-sm border rounded"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Calculating...' : 'Confirm & Calculate'}
        </button>
      </div>
    </div>
  );
}

function SummaryStep({ payload, onSubmit, onCancel, loading }: StepProps) {
  const calculation = payload?.calculation;

  if (!calculation) return null;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Tax Calculation Summary
      </h3>

      {/* Results */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Gross Income:</span>
          <span className="font-medium">CHF {calculation.grossIncome.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Total Deductions:</span>
          <span className="font-medium text-green-600">
            - CHF {calculation.totalDeductions.toLocaleString()}
          </span>
        </div>
        <div className="border-t pt-2 flex justify-between">
          <span className="text-gray-600">Taxable Income:</span>
          <span className="font-semibold">
            CHF {calculation.taxableIncome.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-lg">
          <span className="font-medium">Estimated Tax:</span>
          <span className="font-bold text-primary-600">
            CHF {calculation.estimatedTax.toLocaleString()}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          Effective tax rate: {calculation.taxRate}%
        </div>
      </div>

      {/* Recommendations */}
      {calculation.recommendations?.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-800 mb-2">Recommendations</h4>
          <ul className="space-y-2">
            {calculation.recommendations.map((rec: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-yellow-500">💡</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit({ generatePdf: false })}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
        >
          Finish
        </button>
        <button
          onClick={() => onSubmit({ generatePdf: true })}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate PDF'}
        </button>
      </div>
    </div>
  );
}

function CompletedStep({
  result,
  onClose,
}: {
  result: any;
  onClose: () => void;
}) {
  return (
    <div className="p-6 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Tax Calculation Complete!
      </h3>
      <p className="text-gray-600 mb-4">{result?.summary || 'Your tax calculation has been completed.'}</p>

      {result?.pdfGenerated && result?.pdfUrl && (
        <a
          href={result.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Download PDF
        </a>
      )}

      <div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}
