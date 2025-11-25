import { X } from 'lucide-react';
import type { ReactNode } from "react";
import { Modal } from '../common/Modal';

interface SwissTaxData {
  name?: string;
  maritalStatus?: string;
  income?: number;
  deductions?: number;
  [key: string]: any;
}

interface ToolResult {
  success?: boolean;
  data?: SwissTaxData;
  scenario?: string;
  [key: string]: any;
}

interface TaxDataModalProps {
  isOpen: boolean;
  toolResult: ToolResult | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TaxDataModal({
  isOpen,
  toolResult,
  onConfirm,
  onCancel
}: TaxDataModalProps) {
  // Extract data from tool result
  const taxData = toolResult?.success ? toolResult.data : null;

  if (!taxData) return null;

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || amount === null) return 'CHF 0';
    return `CHF ${amount.toLocaleString()}`;
  };

  const isYearField = (key: string): boolean => {
    const yearFields = ['year', 'taxyear', 'fiscalyear', 'birthyear'];
    return yearFields.includes(key.toLowerCase().replace(/[_\s]/g, ''));
  };

  const isCurrencyField = (key: string): boolean => {
    const currencyFields = ['income', 'salary', 'deduction', 'tax', 'amount', 'expense', 'asset', 'wealth', 'contribution', 'pension', 'rent', 'cost', 'fee', 'payment', 'refund'];
    const lowerKey = key.toLowerCase();
    return currencyFields.some(field => lowerKey.includes(field));
  };

  const formatSimpleValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
      if (isYearField(key)) return String(value);
      if (isCurrencyField(key) || value >= 100) return formatCurrency(value);
      return String(value);
    }
    return String(value);
  };

  const renderValue = (key: string, value: any): ReactNode => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
      if (isYearField(key)) return String(value);
      if (isCurrencyField(key) || value >= 100) return formatCurrency(value);
      return String(value);
    }
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length === 0) return '-';
        return (
          <div className="space-y-1">
            {value.map((item, idx) => (
              <div key={idx} className="text-sm">
                {typeof item === 'object'
                  ? Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(', ')
                  : String(item)
                }
              </div>
            ))}
          </div>
        );
      }
      // Nested object
      const entries = Object.entries(value);
      if (entries.length === 0) return '-';
      return (
        <div className="space-y-1">
          {entries.map(([k, v]) => (
            <div key={k} className="text-sm">
              <span className="text-gray-500 dark:text-gray-400 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</span>{' '}
              {formatSimpleValue(k, v)}
            </div>
          ))}
        </div>
      );
    }
    return String(value);
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tax Data Loaded</h2>
        <button
          onClick={onCancel}
          className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="space-y-3">
          {Object.entries(taxData).map(([key, value]) => (
            <div key={key} className="py-2 border-b border-gray-100 dark:border-gray-700">
              <div className="text-gray-500 dark:text-gray-400 text-sm font-medium capitalize mb-1">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              <div className="text-gray-900 dark:text-gray-100 font-semibold">
                {renderValue(key, value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6">
        <button
          onClick={onConfirm}
          className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </Modal>
  );
}
