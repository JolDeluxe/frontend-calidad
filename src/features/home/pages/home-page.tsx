import { useAuthSession } from '@/providers/auth-provider';
import { Icon } from '@/components/ui/icon';

export function HomePage() {
  const { user } = useAuthSession();

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm flex flex-col gap-2">
        <h2 className="fuente-titulos text-3xl text-slate-800">
          Panel de Inicio
        </h2>
        <p className="text-sm text-slate-600">
          Bienvenido al sistema. Tu sesión está activa y validada con token seguro y cookie HttpOnly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-marca-primario font-semibold text-sm">
            <Icon name="badge" size="20px" />
            <span>Información del Usuario</span>
          </div>
          <div className="text-xs text-slate-600 flex flex-col gap-1 mt-2">
            <p><strong>Usuario:</strong> {user?.usuario}</p>
            <p><strong>Nombre:</strong> {user?.nombre}</p>
            <p><strong>Rol:</strong> {user?.rol.codigo} ({user?.rol.nombre})</p>
            <p><strong>ID:</strong> {user?.id}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-marca-primario font-semibold text-sm">
            <Icon name="security" size="20px" />
            <span>Estado de la Plantilla</span>
          </div>
          <div className="text-xs text-slate-600 flex flex-col gap-1 mt-2">
            <p><strong>Arquitectura:</strong> Modular limpia con Layout Universal de 5S</p>
            <p><strong>Rutas:</strong> Protegidas con RequireAuth y DashboardLayout</p>
            <p><strong>Base de Datos:</strong> 10_proyecto_calidad_db</p>
            <p><strong>Diseño:</strong> DesktopSidebar, MobileBottomNav, UserMenu y Footer</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-marca-primario font-semibold text-sm">
            <Icon name="badge" size="20px" />
            <span>Información del Usuario</span>
          </div>
          <div className="text-xs text-slate-600 flex flex-col gap-1 mt-2">
            <p><strong>Usuario:</strong> {user?.usuario}</p>
            <p><strong>Nombre:</strong> {user?.nombre}</p>
            <p><strong>Rol:</strong> {user?.rol.codigo} ({user?.rol.nombre})</p>
            <p><strong>ID:</strong> {user?.id}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-marca-primario font-semibold text-sm">
            <Icon name="security" size="20px" />
            <span>Estado de la Plantilla</span>
          </div>
          <div className="text-xs text-slate-600 flex flex-col gap-1 mt-2">
            <p><strong>Arquitectura:</strong> Modular limpia con Layout Universal de 5S</p>
            <p><strong>Rutas:</strong> Protegidas con RequireAuth y DashboardLayout</p>
            <p><strong>Base de Datos:</strong> 10_proyecto_calidad_db</p>
            <p><strong>Diseño:</strong> DesktopSidebar, MobileBottomNav, UserMenu y Footer</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-marca-primario font-semibold text-sm">
            <Icon name="badge" size="20px" />
            <span>Información del Usuario</span>
          </div>
          <div className="text-xs text-slate-600 flex flex-col gap-1 mt-2">
            <p><strong>Usuario:</strong> {user?.usuario}</p>
            <p><strong>Nombre:</strong> {user?.nombre}</p>
            <p><strong>Rol:</strong> {user?.rol.codigo} ({user?.rol.nombre})</p>
            <p><strong>ID:</strong> {user?.id}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-marca-primario font-semibold text-sm">
            <Icon name="security" size="20px" />
            <span>Estado de la Plantilla</span>
          </div>
          <div className="text-xs text-slate-600 flex flex-col gap-1 mt-2">
            <p><strong>Arquitectura:</strong> Modular limpia con Layout Universal de 5S</p>
            <p><strong>Rutas:</strong> Protegidas con RequireAuth y DashboardLayout</p>
            <p><strong>Base de Datos:</strong> 10_proyecto_calidad_db</p>
            <p><strong>Diseño:</strong> DesktopSidebar, MobileBottomNav, UserMenu y Footer</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-marca-primario font-semibold text-sm">
            <Icon name="badge" size="20px" />
            <span>Información del Usuario</span>
          </div>
          <div className="text-xs text-slate-600 flex flex-col gap-1 mt-2">
            <p><strong>Usuario:</strong> {user?.usuario}</p>
            <p><strong>Nombre:</strong> {user?.nombre}</p>
            <p><strong>Rol:</strong> {user?.rol.codigo} ({user?.rol.nombre})</p>
            <p><strong>ID:</strong> {user?.id}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-marca-primario font-semibold text-sm">
            <Icon name="security" size="20px" />
            <span>Estado de la Plantilla</span>
          </div>
          <div className="text-xs text-slate-600 flex flex-col gap-1 mt-2">
            <p><strong>Arquitectura:</strong> Modular limpia con Layout Universal de 5S</p>
            <p><strong>Rutas:</strong> Protegidas con RequireAuth y DashboardLayout</p>
            <p><strong>Base de Datos:</strong> 10_proyecto_calidad_db</p>
            <p><strong>Diseño:</strong> DesktopSidebar, MobileBottomNav, UserMenu y Footer</p>
          </div>
        </div>
      </div>

    </div>
  );
}