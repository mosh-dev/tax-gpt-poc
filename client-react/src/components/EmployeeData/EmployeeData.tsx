import { useState, useEffect } from 'react';
import { Users, DollarSign, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { apiService } from '../../services/api';
import type { Employee, SwissTaxData } from '../../types';

export default function EmployeeData() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getEmployees();
      setEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === 0) return '-';
    return `CHF ${amount.toLocaleString('de-CH')}`;
  };

  const calculateTotalIncome = (income: SwissTaxData['income']) => {
    return (income.employment || 0) +
      (income.selfEmployment || 0) +
      (income.investments || 0) +
      (income.rental || 0) +
      (income.other || 0);
  };

  const calculateTotalDeductions = (deductions: SwissTaxData['deductions']) => {
    return (deductions.professionalExpenses || 0) +
      (deductions.healthcareExpenses || 0) +
      (deductions.pillar3a || 0) +
      (deductions.childcare || 0) +
      (deductions.education || 0) +
      (deductions.commuting || 0) +
      (deductions.donations || 0);
  };

  const calculateTotalWealth = (wealth: SwissTaxData['wealth']) => {
    return (wealth.bankAccounts || 0) +
      (wealth.securities || 0) +
      (wealth.realEstate || 0) +
      (wealth.other || 0);
  };

  const toggleExpand = (scenarioId: string) => {
    setExpandedEmployee(expandedEmployee === scenarioId ? null : scenarioId);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No employee data found in the database
          </div>
        ) : (
          <div className="space-y-4">
            {employees.map((employee) => (
              <div
                key={employee.scenarioId}
                className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* Employee Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(employee.scenarioId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-primary-600" />
                        <h3 className="font-semibold text-gray-900">
                          {employee.taxData.personalInfo.firstName} {employee.taxData.personalInfo.lastName}
                        </h3>
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                          {employee.scenarioName}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{employee.scenarioDescription}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          {formatCurrency(calculateTotalIncome(employee.taxData.income))}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Tax Year {employee.taxData.taxYear}
                        </span>
                        <span>
                          {employee.taxData.personalInfo.maritalStatus.charAt(0).toUpperCase() +
                            employee.taxData.personalInfo.maritalStatus.slice(1)}
                        </span>
                      </div>
                    </div>
                    <button className="p-1 text-gray-400">
                      {expandedEmployee === employee.scenarioId ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedEmployee === employee.scenarioId && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Personal Info */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Personal Information</h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-gray-500">Date of Birth:</span> {employee.taxData.personalInfo.dateOfBirth}</p>
                          <p><span className="text-gray-500">Address:</span> {employee.taxData.personalInfo.address}</p>
                          <p><span className="text-gray-500">Municipality:</span> {employee.taxData.personalInfo.municipality}</p>
                          <p><span className="text-gray-500">Status:</span> {employee.taxData.personalInfo.maritalStatus}</p>
                        </div>
                      </div>

                      {/* Income */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Income</h4>
                        <div className="space-y-1 text-sm">
                          {employee.taxData.income.employment !== undefined && (
                            <p><span className="text-gray-500">Employment:</span> {formatCurrency(employee.taxData.income.employment)}</p>
                          )}
                          {employee.taxData.income.selfEmployment !== undefined && (
                            <p><span className="text-gray-500">Self-Employment:</span> {formatCurrency(employee.taxData.income.selfEmployment)}</p>
                          )}
                          {employee.taxData.income.investments !== undefined && (
                            <p><span className="text-gray-500">Investments:</span> {formatCurrency(employee.taxData.income.investments)}</p>
                          )}
                          {employee.taxData.income.rental !== undefined && (
                            <p><span className="text-gray-500">Rental:</span> {formatCurrency(employee.taxData.income.rental)}</p>
                          )}
                          {employee.taxData.income.other !== undefined && employee.taxData.income.other > 0 && (
                            <p><span className="text-gray-500">Other:</span> {formatCurrency(employee.taxData.income.other)}</p>
                          )}
                          <p className="font-medium pt-1 border-t border-gray-200">
                            <span className="text-gray-700">Total:</span> {formatCurrency(calculateTotalIncome(employee.taxData.income))}
                          </p>
                        </div>
                      </div>

                      {/* Deductions */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Deductions</h4>
                        <div className="space-y-1 text-sm">
                          {employee.taxData.deductions.professionalExpenses !== undefined && (
                            <p><span className="text-gray-500">Professional:</span> {formatCurrency(employee.taxData.deductions.professionalExpenses)}</p>
                          )}
                          {employee.taxData.deductions.healthcareExpenses !== undefined && (
                            <p><span className="text-gray-500">Healthcare:</span> {formatCurrency(employee.taxData.deductions.healthcareExpenses)}</p>
                          )}
                          {employee.taxData.deductions.pillar3a !== undefined && (
                            <p><span className="text-gray-500">Pillar 3a:</span> {formatCurrency(employee.taxData.deductions.pillar3a)}</p>
                          )}
                          {employee.taxData.deductions.childcare !== undefined && (
                            <p><span className="text-gray-500">Childcare:</span> {formatCurrency(employee.taxData.deductions.childcare)}</p>
                          )}
                          {employee.taxData.deductions.education !== undefined && (
                            <p><span className="text-gray-500">Education:</span> {formatCurrency(employee.taxData.deductions.education)}</p>
                          )}
                          {employee.taxData.deductions.commuting !== undefined && (
                            <p><span className="text-gray-500">Commuting:</span> {formatCurrency(employee.taxData.deductions.commuting)}</p>
                          )}
                          {employee.taxData.deductions.donations !== undefined && (
                            <p><span className="text-gray-500">Donations:</span> {formatCurrency(employee.taxData.deductions.donations)}</p>
                          )}
                          <p className="font-medium pt-1 border-t border-gray-200">
                            <span className="text-gray-700">Total:</span> {formatCurrency(calculateTotalDeductions(employee.taxData.deductions))}
                          </p>
                        </div>
                      </div>

                      {/* Wealth */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Wealth</h4>
                        <div className="space-y-1 text-sm">
                          {employee.taxData.wealth.bankAccounts !== undefined && (
                            <p><span className="text-gray-500">Bank Accounts:</span> {formatCurrency(employee.taxData.wealth.bankAccounts)}</p>
                          )}
                          {employee.taxData.wealth.securities !== undefined && (
                            <p><span className="text-gray-500">Securities:</span> {formatCurrency(employee.taxData.wealth.securities)}</p>
                          )}
                          {employee.taxData.wealth.realEstate !== undefined && employee.taxData.wealth.realEstate > 0 && (
                            <p><span className="text-gray-500">Real Estate:</span> {formatCurrency(employee.taxData.wealth.realEstate)}</p>
                          )}
                          {employee.taxData.wealth.other !== undefined && employee.taxData.wealth.other > 0 && (
                            <p><span className="text-gray-500">Other:</span> {formatCurrency(employee.taxData.wealth.other)}</p>
                          )}
                          <p className="font-medium pt-1 border-t border-gray-200">
                            <span className="text-gray-700">Total:</span> {formatCurrency(calculateTotalWealth(employee.taxData.wealth))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <p className="text-xs text-gray-500">
          {employees.length} scenario{employees.length !== 1 ? 's' : ''} available for testing
        </p>
      </div>
    </div>
  );
}
