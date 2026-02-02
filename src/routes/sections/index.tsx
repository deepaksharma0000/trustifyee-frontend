import { Navigate, useRoutes } from 'react-router-dom';
// layouts
import MainLayout from 'src/layouts/main';
// config
// import { PATH_AFTER_LOGIN } from 'src/config-global';
//
import { mainRoutes, HomePage } from './main';
import { authRoutes } from './auth';
import { authDemoRoutes } from './auth-demo';
import { dashboardRoutes } from './dashboard';
import { componentsRoutes } from './components';



// ----------------------------------------------------------------------

export default function Router() {
  return useRoutes([
    {
    path: '/',
    element: <Navigate to="/auth/jwt/login" replace />,
    },


    // Auth routes
    ...authRoutes,
    ...authDemoRoutes,

    // Dashboard routes
    ...dashboardRoutes,

    // Main routes
    ...mainRoutes,

    // Components routes
    ...componentsRoutes,

    // No match 404
    { path: '*', element: <Navigate to="/404" replace /> },
  ]);
}
