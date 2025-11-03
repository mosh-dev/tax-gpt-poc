import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../../services/api.service';
import { Message, SwissTaxData } from '../../models/tax.model';
import { TaxDataModal } from '../tax-data-modal/tax-data-modal';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule, TaxDataModal],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat {
  messages: Message[] = [];
  currentMessage = '';
  isLoading = false;
  error: string | null = null;

  // Tax data (loaded via tool calling)
  loadedTaxData: SwissTaxData | null = null;
  isDownloadingPDF = false;

  // Modal state for tool confirmation
  isModalOpen = false;
  pendingTaxData: SwissTaxData | null = null;
  pendingScenario: string = '';
  pendingToolCallId: string = '';

  constructor(
    private apiService: ApiService,
    private sanitizer: DomSanitizer
  ) {
    this.initializeChat();
  }

  /**
   * Initialize chat with welcome message
   */
  private initializeChat() {
    this.messages.push({
      role: 'assistant',
      content: 'Hallo! I\'m your Swiss tax assistant for Canton Zurich. I can help you with your tax return by loading your tax data, calculating deductions, and generating PDF documents. Just ask me naturally!\n\nTry asking:\n- "Get my single tax data"\n- "Load married tax scenario"\n- "Calculate my deductions"\n- "Generate a PDF of my tax return"',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send message to tax assistant using SSE streaming with tool support
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

      // Subscribe to SSE stream with tool support
      this.apiService.streamMessageWithTools(contextualMessage, this.messages).subscribe({
        next: (event) => {
          console.log('🎯 Frontend received event:', event);

          if (event.type === 'connected') {
            console.log('✅ SSE connected');
          } else if (event.type === 'chunk' && event.content) {
            // Append chunk to assistant message
            console.log('📝 Appending chunk to message');
            assistantMessage.content += event.content;
          } else if (event.type === 'tool-call') {
            // Handle tool call - show loading indicator
            console.log('🔧 Tool called:', {
              toolName: event.toolName,
              args: event.args,
              toolCallId: event.toolCallId
            });
            assistantMessage.content += `\n\n[Calling tool: ${event.toolName}...]`;
          } else if (event.type === 'tool-result' && event.toolName === 'get-tax-data') {
            // Handle tax data tool result - show modal for confirmation
            if (event.result?.success && event.result?.data) {
              this.pendingTaxData = event.result.data;
              this.pendingScenario = event.result.scenario;
              this.pendingToolCallId = event.toolCallId || '';
              this.isModalOpen = true;

              // Update message to show tool was called
              assistantMessage.content = assistantMessage.content.replace(
                `[Calling tool: ${event.toolName}...]`,
                `[Retrieved ${event.result.scenario} tax data - awaiting confirmation]`
              );
            }
          } else if (event.type === 'tool-result' && event.toolName === 'generate-tax-pdf') {
            // Handle PDF generation tool result - show download link
            if (event.result?.success && event.result?.downloadUrl) {
              const downloadUrl = `http://localhost:3000${event.result.downloadUrl}`;
              assistantMessage.content = assistantMessage.content.replace(
                `[Calling tool: ${event.toolName}...]`,
                `✅ ${event.result.message}\n\n📄 [Download PDF](${downloadUrl})`
              );
            } else {
              assistantMessage.content = assistantMessage.content.replace(
                `[Calling tool: ${event.toolName}...]`,
                `❌ Failed to generate PDF: ${event.result?.error || 'Unknown error'}`
              );
            }
          } else if (event.type === 'tool-result' && event.toolName === 'calculate-deductions') {
            // Handle deduction calculation tool result
            console.log('Deduction calculation result:', event.result);
            if (event.result) {
              const result = event.result;
              let summary = `\n\n📊 **Deduction Calculation Results:**\n`;
              summary += `- Total Deductions: CHF ${result.totalDeductions?.toLocaleString() || 0}\n`;
              summary += `- Estimated Tax Savings: CHF ${result.estimatedTaxSavings?.toLocaleString() || 0}\n\n`;

              if (result.recommendations && result.recommendations.length > 0) {
                summary += `💡 **Recommendations:**\n`;
                result.recommendations.forEach((rec: string, idx: number) => {
                  summary += `${idx + 1}. ${rec}\n`;
                });
              }

              assistantMessage.content = assistantMessage.content.replace(
                `[Calling tool: ${event.toolName}...]`,
                summary
              );
            }
          } else if (event.type === 'tool-result') {
            // Handle other tool results
            console.log('Tool result:', event.toolName, event.result);
            assistantMessage.content = assistantMessage.content.replace(
              `[Calling tool: ${event.toolName}...]`,
              `[Tool completed: ${event.toolName}]`
            );
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
   * Handle modal confirmation - user confirms loading tax data
   */
  onConfirmTaxData() {
    if (this.pendingTaxData) {
      // Load the confirmed tax data
      this.loadedTaxData = this.pendingTaxData;

      // Add confirmation message to chat
      this.messages.push({
        role: 'assistant',
        content: `Great! I've loaded your ${this.pendingScenario} tax scenario data into our conversation. I can now provide personalized advice based on your situation.`,
        timestamp: new Date().toISOString()
      });
    }

    // Close modal and clear pending state
    this.isModalOpen = false;
    this.pendingTaxData = null;
    this.pendingScenario = '';
    this.pendingToolCallId = '';
  }

  /**
   * Handle modal cancellation - user rejects loading tax data
   */
  onCancelTaxData() {
    // Add cancellation message to chat
    this.messages.push({
      role: 'assistant',
      content: 'No problem! I won\'t load that tax data. Feel free to ask me anything else about Swiss taxes for Canton Zurich.',
      timestamp: new Date().toISOString()
    });

    // Close modal and clear pending state
    this.isModalOpen = false;
    this.pendingTaxData = null;
    this.pendingScenario = '';
    this.pendingToolCallId = '';
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

  /**
   * Convert markdown links to HTML and sanitize
   * Converts [text](url) to clickable links
   */
  parseMarkdownLinks(content: string): SafeHtml {
    // Convert markdown links [text](url) to HTML <a> tags
    const htmlContent = content.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline font-semibold">$1</a>'
    );

    // Convert line breaks to <br> tags
    const htmlWithBreaks = htmlContent.replace(/\n/g, '<br>');

    // Convert **bold** to <strong>
    const htmlWithBold = htmlWithBreaks.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    return this.sanitizer.sanitize(1, htmlWithBold) || htmlWithBold;
  }
}
