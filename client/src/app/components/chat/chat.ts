import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Message, TaxScenario, SwissTaxData } from '../../models/tax.model';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat implements OnInit {
  messages: Message[] = [];
  currentMessage = '';
  isLoading = false;
  error: string | null = null;

  // Scenario selection
  availableScenarios: TaxScenario[] = [];
  selectedScenario: string = '';
  loadedTaxData: SwissTaxData | null = null;
  isLoadingScenario = false;
  isDownloadingPDF = false;

  constructor(private apiService: ApiService) {
    this.initializeChat();
  }

  async ngOnInit() {
    // Load available scenarios
    try {
      const response = await this.apiService.getScenarios().toPromise();
      if (response?.success) {
        this.availableScenarios = response.scenarios;
      }
    } catch (err) {
      console.error('Failed to load scenarios:', err);
    }
  }

  /**
   * Initialize chat with welcome message
   */
  private initializeChat() {
    this.messages.push({
      role: 'assistant',
      content: 'Hallo! I\'m your Swiss tax assistant for Canton Zurich. How can I help you with your tax return today?',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Load selected tax scenario
   */
  async loadScenario() {
    if (!this.selectedScenario) {
      return;
    }

    this.isLoadingScenario = true;
    try {
      const response = await this.apiService.getTaxData(this.selectedScenario as any).toPromise();
      if (response?.success) {
        this.loadedTaxData = response.data;

        // Add system message showing data is loaded
        this.messages.push({
          role: 'system',
          content: `Loaded tax scenario: ${this.selectedScenario}. Your income: CHF ${this.loadedTaxData.income.employment?.toLocaleString() || 0}`,
          timestamp: new Date().toISOString()
        });

        // Add assistant message acknowledging the data
        const summary = this.generateDataSummary(this.loadedTaxData);
        this.messages.push({
          role: 'assistant',
          content: `I've loaded your tax data. ${summary}\n\nHow can I help you with your tax return?`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err: any) {
      this.error = 'Failed to load scenario data';
      console.error('Load scenario error:', err);
    } finally {
      this.isLoadingScenario = false;
    }
  }

  /**
   * Generate a summary of loaded tax data
   */
  private generateDataSummary(data: SwissTaxData): string {
    const parts = [];

    if (data.personalInfo.maritalStatus) {
      parts.push(`Status: ${data.personalInfo.maritalStatus}`);
    }

    const totalIncome = Object.values(data.income).reduce((sum, val) => sum + (val || 0), 0);
    if (totalIncome > 0) {
      parts.push(`Total income: CHF ${totalIncome.toLocaleString()}`);
    }

    const totalDeductions = Object.values(data.deductions).reduce((sum, val) => sum + (val || 0), 0);
    if (totalDeductions > 0) {
      parts.push(`Total deductions: CHF ${totalDeductions.toLocaleString()}`);
    }

    return parts.join(', ');
  }

  /**
   * Send message to tax assistant using SSE streaming
   */
  async sendMessage() {
    if (!this.currentMessage.trim() || this.isLoading) {
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: this.currentMessage,
      timestamp: new Date().toISOString()
    };

    this.messages.push(userMessage);
    const messageToSend = this.currentMessage;
    this.currentMessage = '';
    this.isLoading = true;
    this.error = null;

    // Create a temporary assistant message that will be updated with streaming chunks
    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };
    this.messages.push(assistantMessage);

    try {
      // Include loaded tax data in the context if available
      let contextualMessage = messageToSend;
      if (this.loadedTaxData) {
        contextualMessage = `[User's Tax Data: ${JSON.stringify(this.loadedTaxData, null, 2)}]\n\nUser Question: ${messageToSend}`;
      }

      // Subscribe to SSE stream
      this.apiService.streamMessage(contextualMessage, this.messages).subscribe({
        next: (event) => {
          if (event.type === 'connected') {
            console.log('SSE connected');
          } else if (event.type === 'chunk' && event.content) {
            // Append chunk to assistant message
            assistantMessage.content += event.content;
          } else if (event.type === 'done') {
            console.log('SSE stream completed');
          } else if (event.type === 'error') {
            this.error = event.error || 'Stream error occurred';
            console.error('Stream error:', event.error);
          }
        },
        error: (err) => {
          this.error = err.message || 'Failed to stream message';
          console.error('Chat streaming error:', err);

          // Remove the empty assistant message if error occurs
          if (assistantMessage.content.trim().length === 0) {
            const index = this.messages.indexOf(assistantMessage);
            if (index > -1) {
              this.messages.splice(index, 1);
            }
          }

          this.isLoading = false;
        },
        complete: () => {
          // Update timestamp when streaming is complete
          assistantMessage.timestamp = new Date().toISOString();
          this.isLoading = false;

          // Remove empty message if no content was received
          if (assistantMessage.content.trim().length === 0) {
            const index = this.messages.indexOf(assistantMessage);
            if (index > -1) {
              this.messages.splice(index, 1);
            }
            this.error = 'No response received from assistant';
          }
        }
      });
    } catch (err: any) {
      this.error = err.message || 'Failed to send message';
      console.error('Chat error:', err);

      // Remove the empty assistant message
      const index = this.messages.indexOf(assistantMessage);
      if (index > -1) {
        this.messages.splice(index, 1);
      }

      this.isLoading = false;
    }
  }

  /**
   * Handle Enter key press
   */
  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Clear chat history
   */
  clearChat() {
    this.messages = [];
    this.initializeChat();
    this.error = null;
  }

  /**
   * Download AI recommendations PDF
   */
  async downloadPDF() {
    // Check if there's any meaningful conversation
    const hasConversation = this.messages.some(msg =>
      msg.role === 'assistant' && msg.content.length > 50
    );

    if (!hasConversation) {
      this.error = 'Please have a conversation with the AI first before downloading recommendations.';
      return;
    }

    this.isDownloadingPDF = true;
    this.error = null;

    try {
      // Download PDF with conversation history and optional tax data
      await this.apiService.downloadAIRecommendationsPDF(
        this.messages,
        this.loadedTaxData || undefined
      );

      // Add success message to chat
      this.messages.push({
        role: 'assistant',
        content: '✓ AI recommendations PDF has been generated and downloaded successfully! This document contains our entire conversation and recommendations for your tax submission.',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      this.error = 'Failed to generate PDF. Please try again.';
      console.error('PDF download error:', err);
    } finally {
      this.isDownloadingPDF = false;
    }
  }
}
