import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/pages/home/home').then((component) => component.HomeComponent),
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
      import('./features/workshops/pages/my-workshops/my-workshops').then(
        (component) => component.MyWorkshopsComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
