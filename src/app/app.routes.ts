import { Routes } from '@angular/router';

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
    path: 'my-workshops',
    loadComponent: () =>
      import('./features/administrador/workshop/pages/my-workshops/my-workshops').then(
        (component) => component.MyWorkshopsComponent,
      ),
  },
  {
    path: 'register-workshop',
    loadComponent: () =>
      import('./features/administrador/workshop/pages/register-workshop/register-workshop').then(
        (component) => component.RegisterWorkshopComponent,
      ),
  },
  {
    path: 'edit-workshop/:id',
    loadComponent: () =>
      import('./features/administrador/workshop/pages/edit-workshop/edit-workshop').then(
        (component) => component.EditWorkshopComponent,
      ),
  },
  {
    path: 'view-workshop/:id',
    loadComponent: () =>
      import('./features/administrador/workshop/pages/view-workshop/view-workshop').then(
        (component) => component.ViewWorkshopComponent,
      ),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/administrador/section/pages/dashboard/dashboard').then(
        (component) => component.DashboardComponent,
      ),
  },
  {
    path: 'staff',
    loadComponent: () =>
      import('./features/administrador/section/pages/staff/staff').then(
        (component) => component.StaffComponent,
      ),
  },
  {
    path: 'services',
    loadComponent: () =>
      import('./features/administrador/section/pages/services/services').then(
        (component) => component.ServicesComponent,
      ),
  },
  {
    path: 'operations',
    loadComponent: () =>
      import('./features/administrador/section/pages/operations/operations').then(
        (component) => component.OperationsComponent,
      ),
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./features/administrador/section/pages/reports/reports').then(
        (component) => component.ReportsComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
