import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface HealthResponse {
  status: string;
}

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);

  getHealth(): Observable<HealthResponse> {
    const apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');
    return this.http.get<HealthResponse>(`${apiBaseUrl}/api/health`);
  }
}
