import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ErrorMessage {
  id: number;
  text: string;
  type: 'error' | 'warning' | 'info';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class ErrorService {
  private errorsSubject = new BehaviorSubject<ErrorMessage[]>([]);
  public errors$ = this.errorsSubject.asObservable();
  private errorIdCounter = 0;

  constructor() {}

  // Show error message
  showError(message: string) {
    this.addMessage(message, 'error');
  }

  // Show warning message
  showWarning(message: string) {
    this.addMessage(message, 'warning');
  }

  // Show info message
  showInfo(message: string) {
    this.addMessage(message, 'info');
  }

  // Remove message
  removeMessage(id: number) {
    const currentErrors = this.errorsSubject.value;
    const updatedErrors = currentErrors.filter((error) => error.id !== id);
    this.errorsSubject.next(updatedErrors);
  }

  // Clear all messages
  clearAll() {
    this.errorsSubject.next([]);
  }

  // Get current errors
  get errors(): ErrorMessage[] {
    return this.errorsSubject.value;
  }

  private addMessage(text: string, type: 'error' | 'warning' | 'info') {
    const id = ++this.errorIdCounter;
    const error: ErrorMessage = {
      id,
      text,
      type,
      timestamp: new Date(),
    };

    const currentErrors = this.errorsSubject.value;
    this.errorsSubject.next([...currentErrors, error]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.removeMessage(id);
    }, 5000);
  }
}
