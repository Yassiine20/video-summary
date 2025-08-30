import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
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

  uploadVideo(title: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('file', file);

    return this.http
      .post(`${environment.apiBaseUrl}/video/upload`, formData)
      .pipe(
        tap(() => {
          // Refresh videos after successful upload
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
