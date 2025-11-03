import { Component, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService, StreamEvent } from '../../services/api.service';
import { Message, SwissTaxData } from '../../models/tax.model';
import { TaxDataModal } from '../tax-data-modal/tax-data-modal';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule, TaxDataModal],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef;

  messages: Message[] = [];
  currentMessage = '';
  isLoading = false;
  error: string | null = null;

  // Tax data (loaded via tool calling)
  loadedTaxData: SwissTaxData | null = null;

  // Modal state for tool confirmation
  isModalOpen = false;
  pendingTaxData: SwissTaxData | null = null;
  pendingScenario: string = '';
  pendingToolCallId: string = '';

  // Auto-scroll control
  private shouldScrollToBottom = false;

  constructor(
    private apiService: ApiService,
    private sanitizer: DomSanitizer
  ) {
    this.initializeChat();
  }

  /**
   * Lifecycle hook - scroll to bottom after view is checked
   */
  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  /**
   * Initialize chat with welcome message
   */
  private initializeChat() {
    this.messages.push({
      role: 'assistant',
      content: 'Hallo! I\'m your Swiss tax assistant for Canton Zurich. I can help you with your tax return by loading your tax data, calculating deductions, and generating PDF documents. Just ask me naturally!\n\nTry asking:\n- "Get my single tax data"\n- "Load married tax scenario"\n- "Calculate my deductions"\n- "Generate a PDF of my tax return"',
      timestamp: new Date().toISOString(),
      firstChunkLoaded: true,
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
      timestamp: new Date().toISOString(),
      firstChunkLoaded: true
    };

    this.messages.push(userMessage);
    this.triggerScroll(); // Scroll after user message

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
    this.triggerScroll(); // Scroll after adding assistant message placeholder

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

          switch (event.type) {
            case 'connected':
              console.log('✅ SSE connected');
              this.triggerScroll(); // Scroll when connected
              break;

            case 'chunk':
              if (event.content) {
                // Append chunk to assistant message
                console.log('📝 Appending chunk to message');
                assistantMessage.content += event.content;
                if (event.content.trim().length > 0) {
                  this.isLoading = false;
                  assistantMessage.firstChunkLoaded = true;
                }
                this.triggerScroll(); // Scroll with each chunk
              }
              break;

            case 'reasoning':
              // Handle reasoning content (optional: you can choose to display or ignore)
              if (event.content) {
                // this.isLoading = false;
                // assistantMessage.firstChunkLoaded = true;
                // Optionally append reasoning to message (or ignore it)
                // assistantMessage.content += event.content;
              }
              break;

            case 'reasoning-finish':
              console.log('✅ Reasoning phase completed');
              break;

            case 'step-finish':
              console.log('✅ Step completed');
              break;

            case 'text-finish':
              console.log('✅ Text generation completed');
              break;

            case 'tool-call':
              // Handle tool call - show loading indicator
              console.log('🔧 Tool called:', {
                toolName: event.toolName,
                args: event.args,
                toolCallId: event.toolCallId
              });
              // assistantMessage.content += `\n\n[Calling tool: ${event.toolName}...]`;
              console.log(`\n\n[Calling tool: ${event.toolName}...]`);
              break;

            case 'tool-result':
              this.handleToolResult(event, assistantMessage);
              break;

            case 'done':
              console.log('SSE stream completed');
              break;

            case 'error':
              this.error = event.error || 'Stream error occurred';
              console.error('Stream error:', event.error);
              break;

            default:
              console.warn('Unknown event type:', event.type);
              break;
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

          // Remove empty message if no content was received AND no chunks were loaded
          // (firstChunkLoaded indicates we received some response, even if just reasoning)
          if (assistantMessage.content.trim().length === 0 && !assistantMessage.firstChunkLoaded) {
            const index = this.messages.indexOf(assistantMessage);
            if (index > -1) {
              this.messages.splice(index, 1);
            }
            this.error = 'No response received from assistant';
          } else if (assistantMessage.content.trim().length === 0 && assistantMessage.firstChunkLoaded) {
            // We received events but no text content - remove the empty message silently
            const index = this.messages.indexOf(assistantMessage);
            if (index > -1) {
              this.messages.splice(index, 1);
            }
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
   * Handle tool result events based on tool name
   */
  private handleToolResult(event: StreamEvent, assistantMessage: Message): void {
    switch (event.toolName) {
      case 'getTaxDataTool':
        // Handle tax data tool result - show modal for confirmation
        if (event.result?.success && event.result?.data) {
          this.pendingTaxData = event.result.data;
          this.pendingScenario = event.result.scenario;
          this.pendingToolCallId = event.toolCallId || '';
          this.isModalOpen = true;

          // Update message to show tool was called
          // assistantMessage.content = assistantMessage.content.replace(
          //   `[Calling tool: ${event.toolName}...]`,
          //   `[Retrieved ${event.result.scenario} tax data - awaiting confirmation]`
          // );
        }
        break;

      case 'generate-tax-pdf':
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
        break;

      case 'calculate-deductions':
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
        break;

      default:
        // Handle other tool results
        console.log('Tool result:', event.toolName, event.result);
        assistantMessage.content = assistantMessage.content.replace(
          `[Calling tool: ${event.toolName}...]`,
          `[Tool completed: ${event.toolName}]`
        );
        break;
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
      this.triggerScroll(); // Scroll after adding confirmation message
    }

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
      this.sendMessage().then();
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
   * Scroll messages container to bottom
   */
  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Scroll to bottom error:', err);
    }
  }

  /**
   * Trigger scroll to bottom on next view check
   */
  private triggerScroll(): void {
    this.shouldScrollToBottom = true;
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
