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

interface DashboardStats {
  totalVideos: number;
  totalDuration: number;
  processedVideos: number;
  pendingVideos: number;
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
  videos: VideoItem[] = [];
  stats: DashboardStats = {
    totalVideos: 0,
    totalDuration: 0,
    processedVideos: 0,
    pendingVideos: 0,
  };

  // UI State
  uploading = false;
  dragging = false;
  loading = false;
  activeTab: 'upload' | 'videos' | 'analytics' = 'upload';

  // Errors
  uploadError: string | null = null;
  loadError: string | null = null;

  constructor(private http: HttpClient, private authService: AuthService) {}

  get hasToken(): boolean {
    const token = this.authService.accessToken;
    return !!token;
  }

  ngOnInit() {
    this.loadUserVideos();
  }

  get user() {
    return this.authService.user;
  }

  get userName() {
    return this.user?.username || 'User';
  }

  // Load user's videos and calculate stats
  loadUserVideos() {
    if (!this.hasToken) return;

    this.loading = true;
    this.loadError = null;

    this.http
      .get<{ videos: VideoItem[]; count: number }>(
        `${environment.apiBaseUrl}/videos/`
      )
      .subscribe({
        next: (response) => {
          this.videos = response.videos;
          this.calculateStats();
          this.loading = false;
        },
        error: (err) => {
          console.error('[Dashboard] Load videos error:', err);
          this.loadError = 'Failed to load videos';
          this.loading = false;
        },
      });
  }

  // Calculate dashboard statistics
  calculateStats() {
    this.stats = {
      totalVideos: this.videos.length,
      totalDuration: this.videos.reduce(
        (sum, video) => sum + (video.duration || 0),
        0
      ),
      processedVideos: this.videos.filter((video) => video.processed).length,
      pendingVideos: this.videos.filter((video) => !video.processed).length,
    };
  }

  // Format duration in minutes
  formatDuration(seconds: number): string {
    if (!seconds) return '0m';
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }

  // Format date
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Switch tabs
  switchTab(tab: 'upload' | 'videos' | 'analytics') {
    this.activeTab = tab;
  }

  // View video details
  viewVideo(video: VideoItem) {
    console.log('[Dashboard] View video:', video.id);
    // Navigate to video detail page or open modal
  }

  // Delete video
  deleteVideo(video: VideoItem) {
    if (!confirm(`Delete "${video.title}"?`)) return;

    this.http.delete(`${environment.apiBaseUrl}/video/${video.id}/`).subscribe({
      next: () => {
        this.videos = this.videos.filter((v) => v.id !== video.id);
        this.calculateStats();
        console.log('[Dashboard] Video deleted:', video.id);
      },
      error: (err) => {
        console.error('[Dashboard] Delete error:', err);
      },
    });
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

    console.log('[API] Upload FormData prepared');

    this.http
      .post<VideoItem>(`${environment.apiBaseUrl}/video/upload`, formData)
      .subscribe({
        next: (response) => {
          console.log('[API] Upload successful:', response);
          this.uploading = false;
          this.selectedFile = null;
          this.title = '';
          // Refresh videos list
          this.loadUserVideos();
          // Switch to videos tab to see the new upload
          this.activeTab = 'videos';
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
