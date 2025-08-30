import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FeaturesComponent } from '../features/features.component';
import { TestimonialsComponent } from '../testimonials/testimonials.component';
import { CallToActionComponent } from '../call-to-action/call-to-action.component';
import { FooterComponent } from '../../shared/footer/footer.component';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [
    FeaturesComponent,
    TestimonialsComponent,
    CallToActionComponent,
    FooterComponent,
  ],
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.css'],
})
export class HeroComponent {
  constructor(private router: Router) {}

  navigateToSignup() {
    this.router.navigate(['/signup']);
  }
}
