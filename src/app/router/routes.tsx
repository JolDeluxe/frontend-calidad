import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, type RouteObject } from 'react-router';
import { ROUTES } from './route-paths';
import { NotFoundPage } from '@/app/errors/not-found-page';
import { ErrorPage } from '@/app/errors/error-page';
import { DashboardLayout } from '@/layouts/dashboard-layout';
import { RequireAuth, RequireRole, RedirectIfAuthenticated } from './route-guards';
import { Skeleton } from '@/components/ui/skeleton';

const LoginPage = lazy(() =>
  import('@/features/auth/pages/login-page').then((m) => ({ default: m.LoginPage })),
);
const HomePage = lazy(() =>
  import('@/features/home/pages/home-page').then((m) => ({ default: m.HomePage })),
);
const SistemaLayoutPage = lazy(() =>
  import('@/features/auditoria/pages/sistema-layout-page').then((m) => ({ default: m.SistemaLayoutPage })),
);
const AuditEventsPage = lazy(() =>
  import('@/features/auditoria/pages/eventos-page').then((m) => ({ default: m.AuditEventsPage })),
);
const TechnicalLogsPage = lazy(() =>
  import('@/features/auditoria/pages/logs-page').then((m) => ({ default: m.TechnicalLogsPage })),
);
const Pm2ConsolePage = lazy(() =>
  import('@/features/auditoria/pages/consola-page').then((m) => ({ default: m.Pm2ConsolePage })),
);
const TerminalesPage = lazy(() =>
  import('@/features/auditoria/pages/terminales-page').then((m) => ({ default: m.TerminalesPage })),
);
const DepartamentosPage = lazy(() =>
  import('@/features/departamentos/pages/departamentos-page').then((m) => ({ default: m.DepartamentosPage })),
);
const DefectosPage = lazy(() =>
  import('@/features/defectos/pages/defectos-page').then((m) => ({ default: m.DefectosPage })),
);
const InspeccionesPage = lazy(() =>
  import('@/features/inspecciones/pages/inspecciones-page').then((m) => ({ default: m.InspeccionesPage })),
);
const RegistroPage = lazy(() =>
  import('@/features/registro/pages/registro-page').then((m) => ({ default: m.RegistroPage })),
);
const UsuariosPage = lazy(() =>
  import('@/features/usuarios/pages/usuarios-page').then((m) => ({ default: m.UsuariosPage })),
);
const ProyeccionPage = lazy(() =>
  import('@/features/proyeccion/pages/proyeccion-page').then((m) => ({ default: m.ProyeccionPage })),
);

function withSuspense(component: ReactNode): ReactNode {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full min-h-[300px] p-6 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      {component}
    </Suspense>
  );
}

export const routes: RouteObject[] = [
  {
    path: ROUTES.LOGIN,
    element: (
      <RedirectIfAuthenticated>
        {withSuspense(<LoginPage />)}
      </RedirectIfAuthenticated>
    ),
    errorElement: <ErrorPage />,
  },
  // Modo Proyección Kiosco / TV (Pestaña dedicada independiente sin Sidebar ni Header)
  {
    path: ROUTES.PROYECCION,
    element: (
      <RequireAuth>
        {withSuspense(<ProyeccionPage />)}
      </RequireAuth>
    ),
    errorElement: <ErrorPage />,
  },
  {
    element: <RequireAuth />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            path: ROUTES.ROOT,
            element: (
              <RequireRole roles={['SUPER_ADMIN']}>
                {withSuspense(<HomePage />)}
              </RequireRole>
            ),
          },
          // Catálogos Administrativos
          {
            path: ROUTES.DEPARTAMENTOS,
            element: (
              <RequireRole roles={['SUPER_ADMIN', 'ADMIN', 'VISUALIZADOR']}>
                {withSuspense(<DepartamentosPage />)}
              </RequireRole>
            ),
          },
          {
            path: ROUTES.DEFECTOS,
            element: (
              <RequireRole roles={['SUPER_ADMIN', 'ADMIN', 'VISUALIZADOR']}>
                {withSuspense(<DefectosPage />)}
              </RequireRole>
            ),
          },
          {
            path: ROUTES.USUARIOS,
            element: (
              <RequireRole roles={['SUPER_ADMIN', 'ADMIN']}>
                {withSuspense(<UsuariosPage />)}
              </RequireRole>
            ),
          },
          // Módulo Operativo de Inspección de Defectos: SUPER_ADMIN, ADMIN, INSPECTOR, COORD, VISUALIZADOR
          {
            path: ROUTES.INSPECCIONES,
            element: (
              <RequireRole roles={['SUPER_ADMIN', 'ADMIN', 'INSPECTOR', 'COORD', 'VISUALIZADOR']}>
                {withSuspense(<InspeccionesPage />)}
              </RequireRole>
            ),
          },
          {
            path: ROUTES.INSPECCION_CAPTURA,
            element: <Navigate to={ROUTES.INSPECCIONES} replace />,
          },
          // Módulo de Registro Histórico de Defectos: SUPER_ADMIN, ADMIN, COORD y VISUALIZADOR
          {
            path: ROUTES.REGISTRO,
            element: (
              <RequireRole roles={['SUPER_ADMIN', 'ADMIN', 'COORD', 'VISUALIZADOR']}>
                {withSuspense(<RegistroPage />)}
              </RequireRole>
            ),
          },
          // Rutas del Módulo Unificado de Sistema y Auditoría: EXCLUSIVO SUPER_ADMIN
          {
            path: ROUTES.SISTEMA,
            element: (
              <RequireRole roles={['SUPER_ADMIN']}>
                {withSuspense(<SistemaLayoutPage />)}
              </RequireRole>
            ),
            children: [
              {
                index: true,
                element: <Navigate to={ROUTES.AUDITORIA_EVENTOS} replace />,
              },
              {
                path: 'auditoria',
                element: withSuspense(<AuditEventsPage />),
              },
              {
                path: 'logs',
                element: withSuspense(<TechnicalLogsPage />),
              },
              {
                path: 'consola',
                element: withSuspense(<Pm2ConsolePage />),
              },
              {
                path: 'terminales',
                element: withSuspense(<TerminalesPage />),
              },
            ],
          },
          // Redirecciones retrocompatibles para URLs previas
          {
            path: '/admin/auditoria',
            element: <Navigate to={ROUTES.AUDITORIA_EVENTOS} replace />,
          },
          {
            path: '/admin/logs',
            element: <Navigate to={ROUTES.AUDITORIA_LOGS} replace />,
          },
          {
            path: '/admin/monitor',
            element: <Navigate to={ROUTES.AUDITORIA_EVENTOS} replace />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];
