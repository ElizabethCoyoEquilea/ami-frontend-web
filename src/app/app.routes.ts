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
      import('./features/workshops/pages/my-workshops/my-workshops').then(
        (component) => component.MyWorkshopsComponent,
      ),
  },
  {
    path: 'register-workshop',
    loadComponent: () =>
      import('./features/workshops/pages/register-workshop/register-workshop').then(
        (component) => component.RegisterWorkshopComponent,
      ),
  },
  {
    path: 'edit-workshop/:id',
    loadComponent: () =>
      import('./features/workshops/pages/edit-workshop/edit-workshop').then(
        (component) => component.EditWorkshopComponent,
      ),
  },
  {
    path: 'workshop-detail/:id',
    loadComponent: () =>
      import('./features/workshops/pages/workshop-detail/workshop-detail').then(
        (component) => component.WorkshopDetailComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
