import PDFDocument from 'pdfkit';
import { SwissTaxData } from '@models/swiss-tax-data.model';

/**
 * Generate a Swiss tax return summary PDF (legacy function for input data)
 */
export async function generateTaxReturnPDF(taxData: SwissTaxData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      // Collect PDF data
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).fillColor('#1976d2').text('Swiss Tax Return Summary', { align: 'center' });
      doc.fontSize(12).fillColor('#666').text(`Canton Zurich - Tax Year ${taxData.taxYear}`, { align: 'center' });
      doc.moveDown(2);

      // Personal Information
      doc.fontSize(16).fillColor('#333').text('Personal Information');
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#000')
        .text(`Name: ${taxData.personalInfo.firstName} ${taxData.personalInfo.lastName}`)
        .text(`Date of Birth: ${taxData.personalInfo.dateOfBirth}`)
        .text(`Address: ${taxData.personalInfo.address}`)
        .text(`Municipality: ${taxData.personalInfo.municipality}`)
        .text(`Marital Status: ${capitalize(taxData.personalInfo.maritalStatus)}`);
      doc.moveDown(1.5);

      // Income Section
      doc.fontSize(16).fillColor('#333').text('Income');
      doc.moveDown(0.5);

      const incomeItems = [
        { label: 'Employment Income', value: taxData.income.employment },
        { label: 'Self-Employment Income', value: taxData.income.selfEmployment },
        { label: 'Investment Income', value: taxData.income.investments },
        { label: 'Rental Income', value: taxData.income.rental },
        { label: 'Other Income', value: taxData.income.other },
      ];

      let totalIncome = 0;
      incomeItems.forEach(item => {
        if (item.value && item.value > 0) {
          doc.fontSize(11).fillColor('#000').text(`${item.label}: CHF ${formatCurrency(item.value)}`);
          totalIncome += item.value;
        }
      });

      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#1976d2').font('Helvetica-Bold').text(`Total Income: CHF ${formatCurrency(totalIncome)}`);
      doc.font('Helvetica').moveDown(1.5);

      // Deductions Section
      doc.fontSize(16).fillColor('#333').text('Deductions');
      doc.moveDown(0.5);

      const deductionItems = [
        { label: 'Professional Expenses', value: taxData.deductions.professionalExpenses },
        { label: 'Healthcare Expenses', value: taxData.deductions.healthcareExpenses },
        { label: 'Pillar 3a Contributions', value: taxData.deductions.pillar3a },
        { label: 'Childcare Expenses', value: taxData.deductions.childcare },
        { label: 'Education Expenses', value: taxData.deductions.education },
        { label: 'Commuting Expenses', value: taxData.deductions.commuting },
        { label: 'Donations', value: taxData.deductions.donations },
      ];

      let totalDeductions = 0;
      deductionItems.forEach(item => {
        if (item.value && item.value > 0) {
          doc.fontSize(11).fillColor('#000').text(`${item.label}: CHF ${formatCurrency(item.value)}`);
          totalDeductions += item.value;
        }
      });

      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#1976d2').font('Helvetica-Bold').text(`Total Deductions: CHF ${formatCurrency(totalDeductions)}`);
      doc.font('Helvetica').moveDown(1.5);

      // Wealth Section (if applicable)
      const hasWealth = Object.values(taxData.wealth).some(val => val && val > 0);
      if (hasWealth) {
        // Check if we need a new page for wealth section
        if (doc.y > doc.page.height - 200) {
          doc.addPage();
        }

        doc.fontSize(16).fillColor('#333').text('Wealth Declaration');
        doc.moveDown(0.5);

        const wealthItems = [
          { label: 'Bank Accounts', value: taxData.wealth.bankAccounts },
          { label: 'Securities', value: taxData.wealth.securities },
          { label: 'Real Estate', value: taxData.wealth.realEstate },
          { label: 'Other Assets', value: taxData.wealth.other },
        ];

        let totalWealth = 0;
        wealthItems.forEach(item => {
          if (item.value && item.value > 0) {
            doc.fontSize(11).fillColor('#000').text(`${item.label}: CHF ${formatCurrency(item.value)}`);
            totalWealth += item.value;
          }
        });

        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#1976d2').font('Helvetica-Bold').text(`Total Wealth: CHF ${formatCurrency(totalWealth)}`);
        doc.font('Helvetica').moveDown(2); // Increased spacing
      }

      // Summary Box
      // Check if we need a new page for the summary
      const summaryBoxHeight = 110;
      if (doc.y > doc.page.height - summaryBoxHeight - 150) {
        doc.addPage();
      }

      const taxableIncome = totalIncome - totalDeductions;
      const summaryY = doc.y;

      // Draw the box with proper spacing
      doc.rect(50, summaryY, doc.page.width - 100, summaryBoxHeight).fillAndStroke('#e3f2fd', '#1976d2');

      // Add text inside the box with proper positioning
      doc.fillColor('#000')
        .font('Helvetica-Bold').fontSize(14).text('Taxable Income Calculation', 60, summaryY + 15, { continued: false })
        .moveDown(0.3);

      doc.font('Helvetica').fontSize(12)
        .text(`Total Income: CHF ${formatCurrency(totalIncome)}`, 60, summaryY + 40, { continued: false })
        .text(`Total Deductions: CHF ${formatCurrency(totalDeductions)}`, 60, summaryY + 60, { continued: false });

      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1976d2')
        .text(`Taxable Income: CHF ${formatCurrency(taxableIncome)}`, 60, summaryY + 80, { continued: false });

      // Move cursor past the summary box
      doc.y = summaryY + summaryBoxHeight;

      // Footer with proper spacing
      doc.moveDown(2);
      doc.fontSize(9).fillColor('#666')
        .text('This is a summary document generated by Tax-GPT.', { align: 'center' })
        .text('Please consult with a tax professional before submitting your tax return.', { align: 'center' })
        .text(`Generated on: ${new Date().toLocaleDateString('de-CH')}`, { align: 'center' });

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Format number as Swiss currency
 */
function formatCurrency(amount: number): string {
  return amount.toLocaleString('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
