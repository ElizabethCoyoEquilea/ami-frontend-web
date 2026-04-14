import { Routes } from '@angular/router';
import { authChildGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/home/home').then((component) => component.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then((component) => component.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/pages/register/register').then((component) => component.RegisterComponent),
  },
  {
    path: 'admin',
    canActivateChild: [authChildGuard],
    children: [
      {
        path: '',
        redirectTo: 'my-workshops',
        pathMatch: 'full',
      },
      {
        path: 'my-workshops',
        loadComponent: () =>
          import('./features/administrator/workshop/pages/my-workshops/my-workshops').then(
            (component) => component.MyWorkshopsComponent,
          ),
      },
      {
        path: 'register-workshop',
        loadComponent: () =>
          import('./features/administrator/workshop/pages/register-workshop/register-workshop').then(
            (component) => component.RegisterWorkshopComponent,
          ),
      },
      {
        path: 'edit-workshop/:id',
        loadComponent: () =>
          import('./features/administrator/workshop/pages/edit-workshop/edit-workshop').then(
            (component) => component.EditWorkshopComponent,
          ),
      },
      {
        path: 'view-workshop/:id',
        loadComponent: () =>
          import('./features/administrator/workshop/pages/view-workshop/view-workshop').then(
            (component) => component.ViewWorkshopComponent,
          ),
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/administrator/section/pages/dashboard/dashboard').then(
            (component) => component.DashboardComponent,
          ),
      },
      {
        path: 'staff',
        loadComponent: () =>
          import('./features/administrator/section/pages/staff/staff').then(
            (component) => component.StaffComponent,
          ),
      },
      {
        path: 'services',
        loadComponent: () =>
          import('./features/administrator/section/pages/services/services').then(
            (component) => component.ServicesComponent,
          ),
      },
      {
        path: 'operations',
        loadComponent: () =>
          import('./features/administrator/section/pages/operations/operations').then(
            (component) => component.OperationsComponent,
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/administrator/section/pages/reports/reports').then(
            (component) => component.ReportsComponent,
          ),
      },
    ],
  },
  { path: 'my-workshops', redirectTo: 'admin/my-workshops' },
  { path: 'register-workshop', redirectTo: 'admin/register-workshop' },
  { path: 'edit-workshop/:id', redirectTo: 'admin/edit-workshop/:id' },
  { path: 'view-workshop/:id', redirectTo: 'admin/view-workshop/:id' },
  { path: 'dashboard', redirectTo: 'admin/dashboard' },
  { path: 'staff', redirectTo: 'admin/staff' },
  { path: 'services', redirectTo: 'admin/services' },
  { path: 'operations', redirectTo: 'admin/operations' },
  { path: 'reports', redirectTo: 'admin/reports' },
  {
    path: '**',
    redirectTo: '',
  },
];
