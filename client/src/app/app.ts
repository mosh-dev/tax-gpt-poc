import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Chat } from './components/chat/chat';
import { FileUpload } from './components/file-upload/file-upload';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HttpClientModule, CommonModule, Chat, FileUpload],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  title = 'Tax-GPT - Canton Zurich Tax Assistant';
  activeTab: 'chat' | 'upload' = 'chat';

  setActiveTab(tab: 'chat' | 'upload') {
    this.activeTab = tab;
  }

  onPdfExtracted(result: any) {
    console.log('PDF extracted:', result);
    // Switch to chat tab after successful upload
    this.activeTab = 'chat';
  }
}
