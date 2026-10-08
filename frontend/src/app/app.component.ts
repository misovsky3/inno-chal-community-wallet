import { Component, OnInit, inject } from '@angular/core';
import { HealthService } from './health.service';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <main class="page">
      <section class="card" aria-labelledby="page-title">
        <p class="eyebrow">Community Wallet</p>
        <h1 id="page-title">Application starter</h1>
        <p class="description">
          Your Angular frontend is connected to the Python API.
        </p>
        <p class="health" [class.ready]="apiStatus === 'ok'">
          <span class="indicator" aria-hidden="true"></span>
          API status: {{ apiStatus }}
        </p>
      </section>
    </main>
  `,
})
export class AppComponent implements OnInit {
  private readonly healthService = inject(HealthService);
  apiStatus = 'checking';

  ngOnInit(): void {
    this.healthService.getHealth().subscribe({
      next: (response) => {
        this.apiStatus = response.status;
      },
      error: () => {
        this.apiStatus = 'unavailable';
      },
    });
  }
}
