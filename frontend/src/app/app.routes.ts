import { Routes } from '@angular/router';
import { CommunitiesList } from './communities-list/communities-list';
import { Dashboard } from './dashboard/dashboard';
import { FunctionUnavailable } from './function-unavailable/function-unavailable';
import { LoginScreen } from './login-screen/login-screen';

export const routes: Routes = [
  { path: '', component: LoginScreen },
  { path: 'join/:token', component: LoginScreen },
  { path: 'dashboard', component: Dashboard },
  { path: 'communities-list', component: CommunitiesList },
  { path: 'function-unavailable', component: FunctionUnavailable },
  { path: '**', redirectTo: '' },
];
