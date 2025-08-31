import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, interval, switchMap, takeWhile, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VideoItem {
  id: number;
  title: string;
  file: string;
  uploaded_at: string;
  processed: boolean;
  duration: number | null;
}

export interface VideoDetail extends VideoItem {
  transcript?: TranscriptItem[];
  summary?: SummaryItem[];
}

export interface TranscriptItem {
  id: number;
  video: number;
  text: string;
  start_time: number;
  end_time: number;
  created_at: string;
}

export interface SummaryItem {
  id: number;
  video: number;
  text: string;
  created_at: string;
}

export interface DashboardStats {
  totalVideos: number;
  totalDuration: number;
  processedVideos: number;
  pendingVideos: number;
}

// New interfaces for async processing
export interface VideoUploadResponse extends VideoItem {
  message: string;
  task_id: string;
  status: string;
}

export interface TaskStatusResponse {
  task_id: string;
  status: string; // PENDING, STARTED, SUCCESS, FAILURE
  ready: boolean;
  result?: any;
  error?: string;
  progress?: {
    current: number;
    total: number;
    message: string;
  };
}

export interface ProcessingVideo {
  video: VideoItem;
  taskId: string;
  status: string;
  progress?: {
    current: number;
    total: number;
    message: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class VideoService {
  private videosSubject = new BehaviorSubject<VideoItem[]>([]);
  public videos$ = this.videosSubject.asObservable();

  private statsSubject = new BehaviorSubject<DashboardStats>({
    totalVideos: 0,
    totalDuration: 0,
    processedVideos: 0,
    pendingVideos: 0,
  });
  public stats$ = this.statsSubject.asObservable();

  // Track videos currently being processed
  private processingVideosSubject = new BehaviorSubject<ProcessingVideo[]>([]);
  public processingVideos$ = this.processingVideosSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadVideos(): Observable<{ videos: VideoItem[]; count: number }> {
    return this.http
      .get<{ videos: VideoItem[]; count: number }>(
        `${environment.apiBaseUrl}/videos/`
      )
      .pipe(
        tap((response) => {
          this.videosSubject.next(response.videos);
          this.calculateStats(response.videos);
        })
      );
  }

  uploadVideo(title: string, file: File): Observable<VideoUploadResponse> {
    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('file', file);

    return this.http
      .post<VideoUploadResponse>(`${environment.apiBaseUrl}/video/upload`, formData)
      .pipe(
        tap((response) => {
          // Add video to processing list
          const processingVideo: ProcessingVideo = {
            video: response,
            taskId: response.task_id,
            status: response.status,
          };
          
          const currentProcessing = this.processingVideosSubject.value;
          this.processingVideosSubject.next([...currentProcessing, processingVideo]);
          
          // Start polling for this task
          this.startTaskPolling(response.task_id, response);
          
          // Refresh videos list
          this.loadVideos().subscribe();
        })
      );
  }

  getVideoDetail(videoId: number): Observable<VideoDetail> {
    return this.http.get<VideoDetail>(
      `${environment.apiBaseUrl}/video/${videoId}/`
    );
  }

  deleteVideo(videoId: number): Observable<any> {
    return this.http.delete(`${environment.apiBaseUrl}/video/${videoId}/`).pipe(
      tap(() => {
        // Remove video from local state
        const currentVideos = this.videosSubject.value;
        const updatedVideos = currentVideos.filter((v) => v.id !== videoId);
        this.videosSubject.next(updatedVideos);
        this.calculateStats(updatedVideos);
      })
    );
  }

  // New methods for async processing
  getTaskStatus(taskId: string): Observable<TaskStatusResponse> {
    return this.http.get<TaskStatusResponse>(
      `${environment.apiBaseUrl}/task/${taskId}/status/`
    );
  }

  private startTaskPolling(taskId: string, video: VideoUploadResponse) {
    // Poll every 2 seconds
    interval(2000)
      .pipe(
        switchMap(() => this.getTaskStatus(taskId)),
        takeWhile((status) => !status.ready, true), // Include the final emission
        tap((status) => this.updateProcessingVideoStatus(taskId, status))
      )
      .subscribe({
        next: (status) => {
          if (status.ready) {
            this.handleTaskComplete(taskId, status, video);
          }
        },
        error: (error) => {
          console.error('Error polling task status:', error);
          this.removeFromProcessing(taskId);
        }
      });
  }

  private updateProcessingVideoStatus(taskId: string, status: TaskStatusResponse) {
    const currentProcessing = this.processingVideosSubject.value;
    const updatedProcessing = currentProcessing.map(pv => 
      pv.taskId === taskId 
        ? { ...pv, status: status.status, progress: status.progress }
        : pv
    );
    this.processingVideosSubject.next(updatedProcessing);
  }

  private handleTaskComplete(taskId: string, status: TaskStatusResponse, video: VideoUploadResponse) {
    if (status.status === 'SUCCESS') {
      // Task completed successfully, refresh videos list
      this.loadVideos().subscribe();
    } else if (status.status === 'FAILURE') {
      console.error('Video processing failed:', status.error);
      // Could emit an error event or show notification
    }
    
    // Remove from processing list
    this.removeFromProcessing(taskId);
  }

  private removeFromProcessing(taskId: string) {
    const currentProcessing = this.processingVideosSubject.value;
    const updatedProcessing = currentProcessing.filter(pv => pv.taskId !== taskId);
    this.processingVideosSubject.next(updatedProcessing);
  }

  // Method to manually refresh a specific task (useful for UI)
  refreshTaskStatus(taskId: string): Observable<TaskStatusResponse> {
    return this.getTaskStatus(taskId).pipe(
      tap((status) => this.updateProcessingVideoStatus(taskId, status))
    );
  }

  private calculateStats(videos: VideoItem[]) {
    const stats: DashboardStats = {
      totalVideos: videos.length,
      totalDuration: videos.reduce(
        (sum, video) => sum + (video.duration || 0),
        0
      ),
      processedVideos: videos.filter((video) => video.processed).length,
      pendingVideos: videos.filter((video) => !video.processed).length,
    };
    this.statsSubject.next(stats);
  }

  // Utility methods
  formatDuration(seconds: number | null): string {
    if (!seconds) return '0s';

    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);

      if (remainingSeconds === 0) {
        return `${minutes}m`;
      } else {
        return `${minutes}m ${remainingSeconds}s`;
      }
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
