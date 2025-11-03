import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Chat } from './components/chat/chat';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, Chat],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
}
