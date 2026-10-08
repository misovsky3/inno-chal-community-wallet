import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectorRef } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import {
  EMPTY,
  catchError,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
  tap,
  timer,
} from 'rxjs';
import {
  MyCommunityDashboardService,
  type UserNotification,
} from './my-community-dashboard/my-community-dashboard.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    @if (notification; as item) {
      <button
        class="notification-banner"
        type="button"
        (click)="openNotification(item)"
        aria-live="polite"
      >
        <span class="notification-title">{{ item.title }}</span>
        <span class="notification-message">{{ item.message }}</span>
      </button>
    }
  `,
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dashboardService = inject(MyCommunityDashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cd = inject(ChangeDetectorRef);

  notification: UserNotification | null = null;
  private currentUserId: number | null = null;
  private readonly openedNotificationIds = new Set<number>();

  ngOnInit(): void {
    this.router.events
      .pipe(
        startWith(
          new NavigationEnd(0, this.router.url, this.router.url),
        ),
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map(() => {
          const userId = Number(this.router.parseUrl(this.router.url).queryParams['userId']);
          return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
        }),
        distinctUntilChanged(),
        tap((userId) => {
          if (this.currentUserId !== userId) {
            this.openedNotificationIds.clear();
          }
          this.currentUserId = userId;
          this.notification = null;
        }),
        switchMap((userId) =>
          userId === null
            ? EMPTY
            : timer(0, 5000).pipe(
                switchMap(() =>
                  this.dashboardService.getUserNotifications(userId).pipe(
                    catchError((error: HttpErrorResponse) => {
                      console.error('Unable to load notifications', error);
                      return EMPTY;
                    }),
                  ),
                ),
              ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((notifications) => {
        this.notification =
          notifications.find(
            (item) =>
              item.notification_type === 'new_goal' &&
              item.target_path !== null &&
              !this.openedNotificationIds.has(item.id),
          ) ?? null;
        this.cd.markForCheck();
      });
  }

  openNotification(notification: UserNotification): void {
    if (this.currentUserId === null || !notification.target_path) {
      return;
    }

    const targetPath = notification.target_path;
    this.openedNotificationIds.add(notification.id);
    this.notification = null;
    this.dashboardService
      .markNotificationRead(notification.id, this.currentUserId)
      .subscribe({
        error: (error: HttpErrorResponse) => {
          console.error('Unable to mark notification as read', error);
        },
      });
    void this.router.navigateByUrl(targetPath);
  }
}
