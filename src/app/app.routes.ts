import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { HomeComponent } from './pages/home/home';
import { AuthGuard } from './services/auth-guard';

export const routes: Routes = [
    {
        path: "",
        redirectTo: "login",
        pathMatch: "full"
    },
    {
        path: "login",
        component: Login
    },
    // {
    //     path: "esqueceu-senha",
    //     component: ForgotPasswordComponent
    // },
    {
        path: "home",
        component: HomeComponent,
        // TODO - Tirar comentário quando o AuthGuard estiver implementado
        // canActivate: [AuthGuard]
    },
];
