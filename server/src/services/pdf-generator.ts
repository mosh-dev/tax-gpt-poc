import PDFDocument from 'pdfkit';
import { SwissTaxData } from '../types';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

/**
 * Generate a PDF with AI recommendations and conversation history
 */
export async function generateAIRecommendationsPDF(
  messages: Message[],
  taxData?: SwissTaxData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      // Collect PDF data
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).fillColor('#1976d2').text('Tax-GPT AI Recommendations', { align: 'center' });
      doc.fontSize(12).fillColor('#666').text('Canton Zurich Tax Assistant Report', { align: 'center' });
      doc.moveDown(2);

      // If tax data is available, show summary
      if (taxData) {
        doc.fontSize(14).fillColor('#333').text('Your Tax Profile Summary');
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#000')
          .text(`Name: ${taxData.personalInfo.firstName} ${taxData.personalInfo.lastName}`)
          .text(`Tax Year: ${taxData.taxYear}`)
          .text(`Municipality: ${taxData.personalInfo.municipality}`);
        doc.moveDown(1.5);
      }

      // AI Conversation Section
      doc.fontSize(16).fillColor('#333').text('AI Consultation Summary');
      doc.moveDown(0.5);

      // Filter out system messages and only show meaningful conversation
      const conversationMessages = messages.filter(msg =>
        msg.role !== 'system' && msg.content.trim().length > 0
      );

      conversationMessages.forEach((message, index) => {
        // Check if we need a new page
        if (doc.y > doc.page.height - 150) {
          doc.addPage();
        }

        if (message.role === 'user') {
          // User question
          doc.fontSize(11).fillColor('#1976d2').text('Your Question:', { underline: true });
          doc.moveDown(0.3);
          doc.fontSize(10).fillColor('#333').text(message.content, {
            width: doc.page.width - 100,
            align: 'left'
          });
          doc.moveDown(0.8);
        } else if (message.role === 'assistant') {
          // AI response
          doc.fontSize(11).fillColor('#4caf50').text('AI Assistant Response:', { underline: true });
          doc.moveDown(0.3);
          doc.fontSize(10).fillColor('#000').text(message.content, {
            width: doc.page.width - 100,
            align: 'left'
          });
          doc.moveDown(1.2);

          // Add separator line after each Q&A pair
          if (index < conversationMessages.length - 1) {
            doc.strokeColor('#e0e0e0').lineWidth(0.5)
              .moveTo(50, doc.y)
              .lineTo(doc.page.width - 50, doc.y)
              .stroke();
            doc.moveDown(1);
          }
        }
      });

      // Important Notice Box
      doc.moveDown(2);
      const noticeY = doc.y;
      doc.rect(50, noticeY, doc.page.width - 100, 100).fillAndStroke('#fff3cd', '#ffc107');
      doc.fillColor('#000')
        .fontSize(12).text('Important Notice', 60, noticeY + 10, { bold: true, underline: true })
        .fontSize(9)
        .text('This document contains AI-generated recommendations based on your consultation.', 60, noticeY + 30)
        .text('Please review all information carefully and consult with a qualified tax professional', 60, noticeY + 45)
        .text('before submitting your tax return to the Canton Zurich authorities.', 60, noticeY + 60)
        .text('Tax-GPT is an assistant tool and does not replace professional tax advice.', 60, noticeY + 75);

      // Footer
      doc.moveDown(3);
      doc.fontSize(9).fillColor('#666')
        .text('Tax-GPT - Canton Zurich Tax Assistant', { align: 'center' })
        .text(`Generated on: ${new Date().toLocaleString('de-CH')}`, { align: 'center' });

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

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
      doc.fontSize(12).fillColor('#1976d2').text(`Total Income: CHF ${formatCurrency(totalIncome)}`, { bold: true });
      doc.moveDown(1.5);

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
      doc.fontSize(12).fillColor('#1976d2').text(`Total Deductions: CHF ${formatCurrency(totalDeductions)}`, { bold: true });
      doc.moveDown(1.5);

      // Wealth Section (if applicable)
      const hasWealth = Object.values(taxData.wealth).some(val => val && val > 0);
      if (hasWealth) {
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
        doc.fontSize(12).fillColor('#1976d2').text(`Total Wealth: CHF ${formatCurrency(totalWealth)}`, { bold: true });
        doc.moveDown(1.5);
      }

      // Summary Box
      const taxableIncome = totalIncome - totalDeductions;
      doc.rect(50, doc.y, doc.page.width - 100, 80).fillAndStroke('#e3f2fd', '#1976d2');
      doc.fillColor('#000')
        .fontSize(14).text('Taxable Income Calculation', 60, doc.y - 70, { bold: true })
        .fontSize(12).text(`Total Income: CHF ${formatCurrency(totalIncome)}`, 60)
        .text(`Total Deductions: CHF ${formatCurrency(totalDeductions)}`, 60)
        .fontSize(14).fillColor('#1976d2').text(`Taxable Income: CHF ${formatCurrency(taxableIncome)}`, 60, undefined, { bold: true });

      // Footer
      doc.moveDown(3);
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
