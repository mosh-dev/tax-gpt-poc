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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
        {error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            {error}
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            No employee data found in the database
          </div>
        ) : (
          <div className="space-y-4">
            {employees.map((employee) => (
              <div
                key={employee.scenarioId}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                {/* Employee Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => toggleExpand(employee.scenarioId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {employee.taxData.personalInfo.firstName} {employee.taxData.personalInfo.lastName}
                        </h3>
                        <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs rounded-full">
                          {employee.scenarioName}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{employee.scenarioDescription}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
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
                    <button className="p-1 text-gray-400 dark:text-gray-500">
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
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Personal Info */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Personal Information</h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-gray-500 dark:text-gray-400">Date of Birth:</span> <span className="dark:text-gray-300">{employee.taxData.personalInfo.dateOfBirth}</span></p>
                          <p><span className="text-gray-500 dark:text-gray-400">Address:</span> <span className="dark:text-gray-300">{employee.taxData.personalInfo.address}</span></p>
                          <p><span className="text-gray-500 dark:text-gray-400">Municipality:</span> <span className="dark:text-gray-300">{employee.taxData.personalInfo.municipality}</span></p>
                          <p><span className="text-gray-500 dark:text-gray-400">Status:</span> <span className="dark:text-gray-300">{employee.taxData.personalInfo.maritalStatus}</span></p>
                        </div>
                      </div>

                      {/* Income */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Income</h4>
                        <div className="space-y-1 text-sm">
                          {employee.taxData.income.employment !== undefined && (
                            <p><span className="text-gray-500 dark:text-gray-400">Employment:</span> <span className="dark:text-gray-300">{formatCurrency(employee.taxData.income.employment)}</span></p>
                          )}
                          {employee.taxData.income.selfEmployment !== undefined && (
                            <p><span className="text-gray-500 dark:text-gray-400">Self-Employment:</span> <span className="dark:text-gray-300">{formatCurrency(employee.taxData.income.selfEmployment)}</span></p>
                          )}
                          {employee.taxData.income.investments !== undefined && (
                            <p><span className="text-gray-500 dark:text-gray-400">Investments:</span> <span className="dark:text-gray-300">{formatCurrency(employee.taxData.income.investments)}</span></p>
                          )}
                          {employee.taxData.income.rental !== undefined && (
                            <p><span className="text-gray-500 dark:text-gray-400">Rental:</span> <span className="dark:text-gray-300">{formatCurrency(employee.taxData.income.rental)}</span></p>
                          )}
                          {employee.taxData.income.other !== undefined && employee.taxData.income.other > 0 && (
                            <p><span className="text-gray-500 dark:text-gray-400">Other:</span> <span className="dark:text-gray-300">{formatCurrency(employee.taxData.income.other)}</span></p>
                          )}
                          <p className="font-medium pt-1 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-gray-700 dark:text-gray-200">Total:</span> <span className="dark:text-gray-300">{formatCurrency(calculateTotalIncome(employee.taxData.income))}</span>
                          </p>
                        </div>
                      </div>

                      {/* Deductions */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Deductions</h4>
                        <div className="space-y-1 text-sm">
                          {employee.taxData.deductions.professionalExpenses !== undefined && (
                            <p><span className="text-gray-500 dark:text-gray-400">Professional:</span> <span className="dark:text-gray-300">{formatCurrency(employee.taxData.deductions.professionalExpenses)}</span></p>
                          )}
                          {employee.taxData.deductions.healthcareExpenses !== undefined && (
                            <p><span className="text-gray-500 dark:text-gray-400">Healthcare:</span> <span className="dark:text-gray-300">{formatCurrency(employee.taxData.deductions.healthcareExpenses)}</span></p>
                          )}
                          {employee.taxData.deductions.pillar3a !== undefined && (
                            <p><span className="text-gray-500 dark:text-gray-400">Pillar 3a:</span> <span className="dark:text-gray-300">{formatCurrency(employee.taxData.deductions.pillar3a)}</span></p>
                          )}
                          {employee.taxData.deductions.childcare !== undefined && (
                            <p><span className="text-gray-500 dark:text-gray-400">Childcare:</span> <span className="dark:text-gray-300">{formatCurrency(employee.taxData.deductions.childcare)}</span></p>
                          )}
                          {employee.taxData.deductions.education !== undefined && (
                            <p><span className="text-gray-500 dark:text-gray-400">Education:</span> <span className="dark:text-gray-300">{formatCurrency(employee.taxData.deductions.education)}</span></p>
                          )}
                          {employee.taxData.deductions.commuting !== undefined && (
                            <p><span className="text-gray-500 dark:text-gray-400">Commuting:</span> <span className="dark:text-gray-300">{formatCurrency(employee.taxData.deductions.commuting)}</span></p>
                          )}
                          {employee.taxData.deductions.donations !== undefined && (
                            <p><span className="text-gray-500 dark:text-gray-400">Donations:</span> <span className="dark:text-gray-300">{formatCurrency(employee.taxData.deductions.donations)}</span></p>
                          )}
                          <p className="font-medium pt-1 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-gray-700 dark:text-gray-200">Total:</span> <span className="dark:text-gray-300">{formatCurrency(calculateTotalDeductions(employee.taxData.deductions))}</span>
                          </p>
                        </div>
                      </div>

                      {/* Wealth */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Wealth</h4>
                        <div className="space-y-1 text-sm">
                          {employee.taxData.wealth.bankAccounts !== undefined && (
                            <p><span className="text-gray-500 dark:text-gray-400">Bank Accounts:</span> <span className="dark:text-gray-300">{formatCurrency(employee.taxData.wealth.bankAccounts)}</span></p>
                          )}
                          {employee.taxData.wealth.securities !== undefined && (
                            <p><span className="text-gray-500 dark:text-gray-400">Securities:</span> <span className="dark:text-gray-300">{formatCurrency(employee.taxData.wealth.securities)}</span></p>
                          )}
                          {employee.taxData.wealth.realEstate !== undefined && employee.taxData.wealth.realEstate > 0 && (
                            <p><span className="text-gray-500 dark:text-gray-400">Real Estate:</span> <span className="dark:text-gray-300">{formatCurrency(employee.taxData.wealth.realEstate)}</span></p>
                          )}
                          {employee.taxData.wealth.other !== undefined && employee.taxData.wealth.other > 0 && (
                            <p><span className="text-gray-500 dark:text-gray-400">Other:</span> <span className="dark:text-gray-300">{formatCurrency(employee.taxData.wealth.other)}</span></p>
                          )}
                          <p className="font-medium pt-1 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-gray-700 dark:text-gray-200">Total:</span> <span className="dark:text-gray-300">{formatCurrency(calculateTotalWealth(employee.taxData.wealth))}</span>
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
  );
}
