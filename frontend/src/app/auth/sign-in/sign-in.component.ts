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
    this.auth.authenticate(this.model.username, this.model.password).subscribe({
      next: (res) => {
        this.loading = false;
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.non_field_errors?.[0] || err?.error || 'Login failed';
      }
    });
  }
}
