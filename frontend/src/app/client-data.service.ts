import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ClientDataService {
  private readonly http = inject(HttpClient);
  private readonly clientsEndpoint = '/api/clients';

  getClientData(clientId: string): Observable<unknown> {
    return this.http.get<unknown>(
      `${this.clientsEndpoint}/${encodeURIComponent(clientId)}`,
    );
  }
}
