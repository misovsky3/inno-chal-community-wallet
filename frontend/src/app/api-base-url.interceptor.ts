import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../environments/environment';

const apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

export const apiBaseUrlInterceptor: HttpInterceptorFn = (request, next) => {
  if (!apiBaseUrl || !request.url.startsWith('/api/')) {
    return next(request);
  }

  return next(request.clone({ url: `${apiBaseUrl}${request.url}` }));
};