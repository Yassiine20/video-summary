import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css'],
})
export class SignInComponent {
  loading = false;
  submitted = false;
  error: string | null = null;
  model = { username: '', password: '' };

  constructor(private auth: AuthService, private router: Router) {}

  submit(form: NgForm) {
    this.submitted = true;
    this.error = null;
    if (form.invalid) return;
    this.loading = true;
    console.log('[SignIn] submitting', this.model);
    this.auth.authenticate(this.model.username, this.model.password).subscribe({
      next: (res) => {
        console.log('[SignIn] success', res);
        this.loading = false;
        const navResult = this.router.navigateByUrl('/dashboard');
        if (navResult instanceof Promise) {
          navResult.then(ok => console.log('[SignIn] navigation result', ok)).catch(err => console.error('[SignIn] navigation error', err));
        }
      },
      error: (err) => {
        console.error('[SignIn] error', err);
        this.loading = false;
        this.error = err?.error?.non_field_errors?.[0] || err?.error || 'Login failed';
      }
    });
  }
}
