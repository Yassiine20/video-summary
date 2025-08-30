import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface VideoItem {
  id: number;
  title: string;
  duration: number;
  uploaded_at: string;
  processed: boolean;
  file_url: string;
}

export interface VideoDetail {
  id: number;
  title: string;
  file: string;
  uploaded_at: string;
  processed: boolean;
  duration: number;
  transcript: {
    id: number;
    video: number;
    text: string;
    start_time: number;
    end_time: number;
    created_at: string;
  }[];
  summary: { id: number; video: number; text: string; created_at: string }[];
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
  private statsSubject = new BehaviorSubject<DashboardStats>({
    totalVideos: 0,
    totalDuration: 0,
    processedVideos: 0,
    pendingVideos: 0,
  });

  public videos$ = this.videosSubject.asObservable();
  public stats$ = this.statsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Load videos from API
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

  // Upload a video file
  uploadVideo(file: File, title: string): Observable<VideoItem> {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('file', file);

    return this.http
      .post<VideoItem>(`${environment.apiBaseUrl}/video/upload`, formData)
      .pipe(
        tap((newVideo) => {
          // Add new video to current list
          const currentVideos = this.videosSubject.value;
          const updatedVideos = [newVideo, ...currentVideos];
          this.videosSubject.next(updatedVideos);
          this.calculateStats(updatedVideos);
        })
      );
  }

  // Get video details
  getVideoDetail(videoId: number): Observable<VideoDetail> {
    return this.http.get<VideoDetail>(
      `${environment.apiBaseUrl}/video/${videoId}/`
    );
  }

  // Delete a video
  deleteVideo(videoId: number): Observable<any> {
    return this.http.delete(`${environment.apiBaseUrl}/video/${videoId}/`).pipe(
      tap(() => {
        // Remove video from current list
        const currentVideos = this.videosSubject.value;
        const updatedVideos = currentVideos.filter((v) => v.id !== videoId);
        this.videosSubject.next(updatedVideos);
        this.calculateStats(updatedVideos);
      })
    );
  }

  // Get current videos
  get videos(): VideoItem[] {
    return this.videosSubject.value;
  }

  // Get current stats
  get stats(): DashboardStats {
    return this.statsSubject.value;
  }

  // Calculate statistics
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

  // Utility method to format duration
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

  // Utility method to format date
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
