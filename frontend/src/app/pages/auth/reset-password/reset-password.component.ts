import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
})
export class ResetPasswordComponent {
  new_password = '';
  confirm_password = '';
  loading = false;
  message: string | null = null;
  error: string | null = null;
  uid: string | null = null;
  token: string | null = null;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.route.queryParams.subscribe((params) => {
      this.uid = params['uid'] || null;
      this.token = params['token'] || null;
    });
  }

  submit() {
    if (this.new_password !== this.confirm_password) {
      this.error = 'Passwords do not match.';
      return;
    }
    if (!this.uid || !this.token) {
      this.error = 'Missing reset information.';
      return;
    }
    this.loading = true;
    this.http
      .post(`${environment.apiBaseUrl}/password-reset/confirm/`, {
        uid: this.uid,
        token: this.token,
        new_password: this.new_password,
      })
      .subscribe({
        next: () => {
          this.message = 'Password reset successfully. You can now sign in.';
          this.loading = false;
          setTimeout(() => this.router.navigate(['/signin']), 1500);
        },
        error: (err) => {
          this.error = err.error?.detail || 'Failed to reset password.';
          this.loading = false;
        },
      });
  }
}
