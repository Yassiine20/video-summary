import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AppError {
  message: string;
  type: 'error' | 'warning' | 'info';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class ErrorService {
  private errorsSubject = new BehaviorSubject<AppError[]>([]);
  public errors$ = this.errorsSubject.asObservable();

  showError(message: string) {
    this.addError({ message, type: 'error', timestamp: new Date() });
  }

  showWarning(message: string) {
    this.addError({ message, type: 'warning', timestamp: new Date() });
  }

  showInfo(message: string) {
    this.addError({ message, type: 'info', timestamp: new Date() });
  }

  private addError(error: AppError) {
    const currentErrors = this.errorsSubject.value;
    this.errorsSubject.next([...currentErrors, error]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.removeError(error);
    }, 5000);
  }

  removeError(error: AppError) {
    const currentErrors = this.errorsSubject.value;
    const filteredErrors = currentErrors.filter((e) => e !== error);
    this.errorsSubject.next(filteredErrors);
  }

  clearAllErrors() {
    this.errorsSubject.next([]);
  }
}
