import { X } from 'lucide-react';

interface SwissTaxData {
  name?: string;
  maritalStatus?: string;
  income?: number;
  deductions?: number;
  [key: string]: any;
}

interface TaxDataModalProps {
  isOpen: boolean;
  taxData: SwissTaxData | null;
  scenario: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TaxDataModal({
  isOpen,
  taxData,
  scenario,
  onConfirm,
  onCancel
}: TaxDataModalProps) {
  if (!isOpen || !taxData) return null;

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || amount === null) return 'CHF 0';
    return `CHF ${amount.toLocaleString()}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Tax Data Loaded</h2>
          <button
            onClick={onCancel}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Scenario: <span className="font-semibold text-gray-900">{scenario}</span>
            </p>
          </div>

          <div className="space-y-4">
            {Object.entries(taxData).map(([key, value]) => (
              <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700 font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="text-gray-900 font-semibold">
                  {typeof value === 'number' ? formatCurrency(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
