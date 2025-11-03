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
}
