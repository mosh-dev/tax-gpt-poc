import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Message, ChatResponse, SwissTaxData, PDFExtraction, TaxScenario } from '../models/tax.model';

/**
 * Server-Sent Event types for streaming chat responses
 */
export type StreamEventType =
  | 'connected'          // Initial connection established
  | 'chunk'              // Text chunk received
  | 'reasoning'          // Reasoning content (thinking process)
  | 'reasoning-finish'   // Reasoning phase completed
  | 'step-finish'        // Step completed
  | 'text-finish'        // Text generation completed
  | 'tool-call'          // Tool is being called
  | 'tool-result'        // Tool execution result
  | 'done'               // Stream completed successfully
  | 'error'              // Error occurred
  | 'unknown';           // Unknown/unhandled event type

/**
 * Stream event structure
 */
export interface StreamEvent {
  type: StreamEventType;
  content?: string;
  toolName?: string;
  toolCallId?: string;
  args?: any;
  result?: any;
  error?: string;
  timestamp: string;
  eventType?: string;
  raw?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Stream chat messages with tool calling support using Server-Sent Events (SSE)
   * Returns an Observable that emits chunks and tool events as they arrive
   */
  streamMessageWithTools(message: string, conversationHistory: Message[]): Observable<StreamEvent> {
    return new Observable(observer => {
      // Create fetch request with proper headers
      fetch(`${this.API_URL}/chat/stream-with-tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationHistory
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const readStream = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
              return;
            }

            // Decode the chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete messages (SSE format: "data: {...}\n\n")
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || ''; // Keep incomplete message in buffer

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6)); // Remove 'data: ' prefix
                  observer.next(data);

                  // Complete observable on 'done' or 'error'
                  if (data.type === 'done') {
                    observer.complete();
                    return;
                  } else if (data.type === 'error') {
                    observer.error(new Error(data.error));
                    return;
                  }
                } catch (e) {
                  console.error('Failed to parse SSE message:', e);
                }
              }
            }

            // Continue reading
            readStream();
          }).catch(error => {
            observer.error(error);
          });
        };

        readStream();
      })
      .catch(error => {
        observer.error(error);
      });

      // Cleanup function
      return () => {
        console.log('SSE stream closed');
      };
    });
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
