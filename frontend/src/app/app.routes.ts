import { Routes } from '@angular/router';
import { HeroComponent } from './pages/hero/hero.component';
import { FeaturesComponent } from './pages/features/features.component';
import { DashboardPreviewComponent } from './pages/dashboard-preview/dashboard-preview.component';
import { TestimonialsComponent } from './pages/testimonials/testimonials.component';
import { CallToActionComponent } from './pages/call-to-action/call-to-action.component';
import { inject } from '@angular/core';
import { AuthService } from './core/auth/auth.service';
import { Router } from '@angular/router';
import { UserProfileComponent } from './pages/user-profile/user-profile.component';

// Auth guard function
const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated) {
    return true;
  } else {
    router.navigate(['/']);
    return false;
  }
};

// Guest guard function (redirect authenticated users)
const guestGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated) {
    return true;
  } else {
    router.navigate(['/dashboard']);
    return false;
  }
};

export const routes: Routes = [
  {
    path: '',
    component: HeroComponent,
    title: 'VideoSummarizer - Home',
    canActivate: [guestGuard],
  },
  {
    path: 'features',
    component: FeaturesComponent,
    title: 'Features - VideoSummarizer',
    canActivate: [guestGuard],
  },
  {
    path: 'dashboard',
    component: DashboardPreviewComponent,
    title: 'Dashboard - VideoSummarizer',
    canActivate: [authGuard],
  },
  {
    path: 'testimonials',
    component: TestimonialsComponent,
    title: 'Testimonials - VideoSummarizer',
    canActivate: [guestGuard],
  },
  {
    path: 'pricing',
    component: CallToActionComponent,
    title: 'Pricing - VideoSummarizer',
    canActivate: [guestGuard],
  },
  {
    path: 'signin',
    loadComponent: () =>
      import('./auth/sign-in/sign-in.component').then((m) => m.SignInComponent),
    title: 'Sign In - VideoSummarizer',
    canActivate: [guestGuard],
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./auth/sign-up/sign-up.component').then((m) => m.SignUpComponent),
    title: 'Sign Up - VideoSummarizer',
    canActivate: [guestGuard],
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent
      ),
    title: 'Forgot Password - VideoSummarizer',
    canActivate: [guestGuard],
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      ),
    title: 'Reset Password - VideoSummarizer',
    canActivate: [guestGuard],
  },
  {
    path: 'profile',
    component: UserProfileComponent,
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '' },
];
