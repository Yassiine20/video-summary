import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  message: string | null = null;
  error: string | null = null;

  constructor(private http: HttpClient) {}

  submit() {
    this.loading = true;
    this.message = null;
    this.error = null;
    this.http
      .post<{ detail: string }>(`${environment.apiBaseUrl}/password-reset/`, { email: this.email })
      .subscribe({
        next: (response) => {
            this.message = response.detail;
            this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.detail || 'Failed to send reset email.';
          this.loading = false;
        },
      });
  }
}
