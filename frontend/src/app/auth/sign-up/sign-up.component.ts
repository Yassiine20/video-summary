import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css']
})
export class SignUpComponent {
  loading = false;
  submitted = false;
  error: string | null = null;
  model = { username: '', email: '', first_name: '', last_name: '', password: '' };

  constructor(private auth: AuthService, private router: Router) {}

  submit(form: NgForm) {
    this.submitted = true;
    this.error = null;
    if (form.invalid) return;
    this.loading = true;
    this.auth.signup(this.model).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error || 'Signup failed';
      }
    });
  }
}
