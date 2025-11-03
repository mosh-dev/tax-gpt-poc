import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Message } from '../../models/tax.model';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat {
  messages: Message[] = [];
  currentMessage = '';
  isLoading = false;
  error: string | null = null;

  constructor(private apiService: ApiService) {
    this.initializeChat();
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
   * Send message to tax assistant
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

    try {
      const response = await this.apiService.sendMessage(
        messageToSend,
        this.messages
      ).toPromise();

      if (response?.success && response.message) {
        this.messages.push({
          role: 'assistant',
          content: response.message,
          timestamp: response.timestamp
        });
      } else {
        this.error = response?.error || 'Failed to get response';
      }
    } catch (err: any) {
      this.error = err.message || 'Failed to send message';
      console.error('Chat error:', err);
    } finally {
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
}
