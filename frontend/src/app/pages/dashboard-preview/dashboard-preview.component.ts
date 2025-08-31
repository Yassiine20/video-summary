import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import {
  VideoService,
  VideoItem,
  VideoDetail,
  DashboardStats,
  ProcessingVideo,
} from '../../core/services/video.service';
import { ErrorService } from '../../services/error.service';

@Component({
  selector: 'app-dashboard-preview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-preview.component.html',
  styleUrls: ['./dashboard-preview.component.css'],
})
export class DashboardPreviewComponent implements OnInit, OnDestroy {
  // Data
  selectedFile: File | null = null;
  title = '';
  videos: VideoItem[] = [];
  processingVideos: ProcessingVideo[] = [];
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

  // Video detail state (inline instead of modal)
  selectedVideoForDetail: VideoDetail | null = null;
  loadingVideoDetail = false;
  videoDetailError: string | null = null;
  detailTab: 'summary' | 'transcript' = 'summary';

  // Errors
  uploadError: string | null = null;
  loadError: string | null = null;

  private subscriptions = new Subscription();

  constructor(
    private authService: AuthService,
    private videoService: VideoService,
    private errorService: ErrorService
  ) {}

  get hasToken(): boolean {
    const token = this.authService.accessToken;
    return !!token;
  }

  ngOnInit() {
    this.setupSubscriptions();
    this.loadUserVideos();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private setupSubscriptions() {
    this.subscriptions.add(
      this.videoService.videos$.subscribe((videos) => {
        this.videos = videos;
      })
    );

    this.subscriptions.add(
      this.videoService.stats$.subscribe((stats) => {
        this.stats = stats;
      })
    );

    this.subscriptions.add(
      this.videoService.processingVideos$.subscribe((processingVideos) => {
        this.processingVideos = processingVideos;
      })
    );
  }

  get user() {
    return this.authService.user;
  }

  get userName() {
    return this.user?.username || 'User';
  } // Load user's videos using service
  loadUserVideos() {
    if (!this.hasToken) return;

    this.loading = true;
    this.loadError = null;

    this.videoService.loadVideos().subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        this.errorService.showError('Failed to load videos');
        this.loadError = 'Failed to load videos';
        this.loading = false;
      },
    });
  }

  // Calculate dashboard statistics (removed - now handled by service)

  // Format duration using service utility
  formatDuration(seconds: number | null): string {
    return this.videoService.formatDuration(seconds);
  }

  // Format date using service utility
  formatDate(dateString: string): string {
    return this.videoService.formatDate(dateString);
  }

  // Switch tabs
  switchTab(tab: 'upload' | 'videos' | 'analytics') {
    this.activeTab = tab;
  }

  // View video details using service
  viewVideo(video: VideoItem) {
    this.selectedVideoForDetail = null;
    this.videoDetailError = null;
    this.loadingVideoDetail = true;

    this.videoService.getVideoDetail(video.id).subscribe({
      next: (response) => {
        this.selectedVideoForDetail = response;
        this.loadingVideoDetail = false;
      },
      error: (err) => {
        this.errorService.showError('Failed to load video details');
        this.videoDetailError = 'Failed to load video details';
        this.loadingVideoDetail = false;
      },
    });
  }

  // Go back to video list
  backToVideoList() {
    this.selectedVideoForDetail = null;
    this.videoDetailError = null;
  }

  // Switch detail tabs
  switchDetailTab(tab: 'summary' | 'transcript') {
    this.detailTab = tab;
  }

  // Delete video using service
  deleteVideo(video: VideoItem) {
    if (!confirm(`Delete "${video.title}"?`)) return;

    this.videoService.deleteVideo(video.id).subscribe({
      next: () => {
        // Video removed from state by service
      },
      error: (err) => {
        this.errorService.showError('Failed to delete video');
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
  }

  // Upload video using service
  upload() {
    if (!this.hasToken) {
      this.uploadError = 'Not authenticated';
      return;
    }

    if (!this.selectedFile || !this.title.trim()) {
      this.uploadError = 'Please select a file and enter a title';
      return;
    }

    this.uploading = true;
    this.uploadError = null;

    this.videoService
      .uploadVideo(this.title.trim(), this.selectedFile)
      .subscribe({
        next: (response) => {
          this.uploading = false;
          this.selectedFile = null;
          this.title = '';

          // Show success message with task info
          console.log('Video upload queued for processing:', response.task_id);

          // Switch to videos tab to see the new upload and processing status
          this.activeTab = 'videos';
        },
        error: (error) => {
          this.uploadError = error.error?.message || 'Upload failed';
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

    this.selectedFile = file;
    this.title = file.name.replace(/\.[^.]+$/, '');
  }

  // Utility method for formatting time in transcript
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Method to refresh task status manually
  refreshTaskStatus(taskId: string) {
    this.videoService.refreshTaskStatus(taskId).subscribe({
      next: (status) => {
        console.log('Task status refreshed:', status);
      },
      error: (error) => {
        console.error('Failed to refresh task status:', error);
      },
    });
  }
}
