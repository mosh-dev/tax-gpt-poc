import { Router, Request, Response } from 'express';
import { generateTaxReturnPDF, generateAIRecommendationsPDF } from '../services/pdf-generator';
import { SwissTaxData } from '../types';

const router = Router();

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

/**
 * POST /api/pdf/generate-ai-recommendations
 * Generate a PDF with AI recommendations and conversation history
 */
router.post('/generate-ai-recommendations', async (req: Request, res: Response) => {
  try {
    const { messages, taxData }: { messages: Message[]; taxData?: SwissTaxData } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required',
      });
    }

    // Generate PDF
    const pdfBuffer = await generateAIRecommendationsPDF(messages, taxData);

    // Set headers for PDF download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Tax_GPT_Recommendations_${timestamp}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate PDF',
    });
  }
});

/**
 * POST /api/pdf/generate-tax-return
 * Generate a tax return summary PDF (legacy endpoint)
 */
router.post('/generate-tax-return', async (req: Request, res: Response) => {
  try {
    const { taxData }: { taxData: SwissTaxData } = req.body;

    if (!taxData) {
      return res.status(400).json({
        success: false,
        error: 'Tax data is required',
      });
    }

    // Generate PDF
    const pdfBuffer = await generateTaxReturnPDF(taxData);

    // Set headers for PDF download
    const filename = `Tax_Return_${taxData.personalInfo.lastName}_${taxData.taxYear}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate PDF',
    });
  }
});

export default router;
