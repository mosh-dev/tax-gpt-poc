import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { Chat } from './components/chat/chat';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HttpClientModule, Chat],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  title = 'Tax-GPT - Canton Zurich Tax Assistant';
}
