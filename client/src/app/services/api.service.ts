import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Message, ChatResponse, SwissTaxData, PDFExtraction, TaxScenario } from '../models/tax.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Send a chat message to the tax assistant
   */
  sendMessage(message: string, conversationHistory: Message[]): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.API_URL}/chat`, {
      message,
      conversationHistory
    });
  }

  /**
   * Get mock tax data for a scenario
   */
  getTaxData(scenario: 'single' | 'married' | 'freelancer' = 'single'): Observable<{
    success: boolean;
    data: SwissTaxData;
    scenario: string;
  }> {
    return this.http.get<any>(`${this.API_URL}/tax-data?scenario=${scenario}`);
  }

  /**
   * Get available tax scenarios
   */
  getScenarios(): Observable<{ success: boolean; scenarios: TaxScenario[] }> {
    return this.http.get<any>(`${this.API_URL}/tax-data/scenarios`);
  }

  /**
   * Upload a PDF file for extraction
   */
  uploadPDF(file: File): Observable<PDFExtraction> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<PDFExtraction>(`${this.API_URL}/upload/pdf`, formData);
  }

  /**
   * Generate tax form based on data
   */
  generateTaxForm(taxData: SwissTaxData): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.API_URL}/chat/generate-form`, {
      taxData
    });
  }

  /**
   * Health check
   */
  healthCheck(): Observable<{ status: string; message: string; timestamp: string }> {
    return this.http.get<any>(`${this.API_URL}/health`);
  }

  /**
   * Generate and download AI recommendations PDF
   */
  async downloadAIRecommendationsPDF(messages: Message[], taxData?: SwissTaxData): Promise<void> {
    try {
      const response = await this.http.post(`${this.API_URL}/pdf/generate-ai-recommendations`,
        { messages, taxData },
        { responseType: 'blob' }
      ).toPromise();

      if (response) {
        // Create blob and download
        const blob = new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `Tax_GPT_Recommendations_${timestamp}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download AI recommendations PDF:', error);
      throw error;
    }
  }

  /**
   * Generate and download tax return PDF (legacy - input data only)
   */
  async downloadTaxReturnPDF(taxData: SwissTaxData): Promise<void> {
    try {
      const response = await this.http.post(`${this.API_URL}/pdf/generate-tax-return`,
        { taxData },
        { responseType: 'blob' }
      ).toPromise();

      if (response) {
        // Create blob and download
        const blob = new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Tax_Return_${taxData.personalInfo.lastName}_${taxData.taxYear}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download PDF:', error);
      throw error;
    }
  }
}
