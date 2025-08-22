import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';

interface VideoItem {
  id: number;
  title: string;
  file: string;
  uploaded_at: string;
  processed: boolean;
  duration: number | null;
}

@Component({
  selector: 'app-dashboard-preview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-preview.component.html',
  styleUrls: ['./dashboard-preview.component.css'],
})
export class DashboardPreviewComponent implements OnInit {
  // Data
  selectedFile: File | null = null;
  title = '';

  // UI State
  uploading = false;
  dragging = false;

  // Errors
  uploadError: string | null = null;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getAuthHeadersForFormData(): HttpHeaders {
    const token = localStorage.getItem('vs_access_token');
    console.log('[Headers] Creating form-data headers with token:', !!token);

    if (!token) {
      return new HttpHeaders();
    }

    // Don't set Content-Type for FormData - let browser set it with boundary
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  get hasToken(): boolean {
    const token = localStorage.getItem('vs_access_token');
    console.log('[Dashboard] Token exists:', !!token);
    return !!token;
  }

  ngOnInit() {
    console.log('[Dashboard] Component initialized');
  }

  // File selection
  onFileChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] || null;

    if (this.selectedFile && !this.title) {
      this.title = this.selectedFile.name.replace(/\.[^.]+$/, '');
    }
    console.log('[File] Selected:', this.selectedFile?.name);
  }

  // Upload video
  upload() {
    if (!this.hasToken) {
      this.uploadError = 'Not authenticated';
      return;
    }

    if (!this.selectedFile || !this.title.trim()) {
      this.uploadError = 'Please select a file and enter a title';
      return;
    }

    console.log('[API] Uploading video:', this.title);
    this.uploading = true;
    this.uploadError = null;

    const formData = new FormData();
    formData.append('title', this.title.trim());
    formData.append('file', this.selectedFile);

    const headers = this.getAuthHeadersForFormData();
    console.log('[API] Upload headers:', headers);

    this.http
      .post<VideoItem>(`${environment.apiBaseUrl}/video/upload`, formData, {
        headers,
      })
      .subscribe({
        next: (response) => {
          console.log('[API] Upload successful:', response);
          this.uploading = false;
          this.selectedFile = null;
          this.title = '';
        },
        error: (err) => {
          console.error('[API] Upload error:', err);
          this.uploadError =
            err.error?.detail || err.message || 'Upload failed';
          this.uploading = false;
        },
      });
  }

  // Drag and drop handlers
  @HostListener('window:dragover', ['$event'])
  onWindowDragOver(e: DragEvent) {
    e.preventDefault();
  }

  @HostListener('window:drop', ['$event'])
  onWindowDrop(e: DragEvent) {
    e.preventDefault();
  }

  onDragEnter(e: DragEvent) {
    e.preventDefault();
    this.dragging = true;
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragging = true;
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    this.dragging = false;
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging = false;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('video/')) {
      this.uploadError = 'Only video files are allowed';
      return;
    }

    console.log('[Drag] File dropped:', file.name);
    this.selectedFile = file;
    this.title = file.name.replace(/\.[^.]+$/, '');
  }
}
