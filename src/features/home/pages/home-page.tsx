import { useState } from 'react';
import { useAuthSession } from '@/providers/auth-provider';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useTerminalStatus } from '@/features/terminales/hooks/use-terminal-status';
import { TerminalVinculacionModal } from '@/features/terminales/components/terminal-vinculacion-modal';

export function HomePage() {
  const { user } = useAuthSession();
  const { estado: terminalEstado, terminal, recargar } = useTerminalStatus();
  const [modalVinculacionAbierto, setModalVinculacionAbierto] = useState(false);

  const esSuperAdmin = user?.rol?.codigo === 'SUPER_ADMIN';

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm flex flex-col gap-2">
        <h2 className="fuente-titulos text-3xl text-slate-800">
          Panel de Inicio
        </h2>
        <p className="text-sm text-slate-600">
          Bienvenido al Sistema de Calidad MBC. Tu sesión está activa y validada con token seguro y cookie HttpOnly.
        </p>
      </div>

      {/* Tarjeta de Información de la Terminal Física */}
      <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-marca-primario font-semibold text-sm">
            <Icon name="computer" size="20px" />
            <span>Estación de Trabajo Física (PC Planta)</span>
          </div>
          {terminalEstado === 'vinculada' && terminal ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
              Vinculada
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
              No Vinculada
            </span>
          )}
        </div>

        {terminalEstado === 'vinculada' && terminal ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1 text-xs">
            <div className="flex flex-col gap-1 p-3 bg-slate-50 border border-slate-200/70 rounded-md">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Nombre de Estación
              </span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {terminal.nombre}
              </span>
            </div>

            <div className="flex flex-col gap-1 p-3 bg-slate-50 border border-slate-200/70 rounded-md">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Departamento de Captura
              </span>
              <span className="font-bold text-marca-primario text-sm uppercase">
                {terminal.departamentoNombre}
              </span>
            </div>

            <div className="flex flex-col justify-between p-3 bg-slate-50 border border-slate-200/70 rounded-md">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Estado Operativo
              </span>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-700">
                  Habilitada para Inspecciones
                </span>
                <button
                  type="button"
                  onClick={() => setModalVinculacionAbierto(true)}
                  className="text-[11px] text-marca-primario hover:underline font-semibold cursor-pointer"
                  title="Cambiar o revincular estación física"
                >
                  Cambiar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-md">
            <div className="flex items-start gap-3">
              <Icon name="phonelink_erase" size="24px" className="text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Esta computadora no está vinculada a una estación de captura
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {esSuperAdmin
                    ? 'Como Super Administrador puedes operar en modo consulta global sin requerir vinculación física.'
                    : 'Para capturar defectos operativos, vincula esta PC ingresando el código OTP generado por tu supervisor.'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setModalVinculacionAbierto(true)}
              className="text-xs shrink-0 cursor-pointer"
            >
              <Icon name="key" size="14px" className="mr-1.5" />
              <span>Vincular Estación (OTP)</span>
            </Button>
          </div>
        )}
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
            <span>Estado del Sistema</span>
          </div>
          <div className="text-xs text-slate-600 flex flex-col gap-1 mt-2">
            <p><strong>Arquitectura:</strong> Modular con Layout Universal de 5S</p>
            <p><strong>Rutas:</strong> Protegidas con RequireAuth y DashboardLayout</p>
            <p><strong>Base de Datos:</strong> 10_proyecto_calidad_db</p>
            <p><strong>Diseño:</strong> DesktopSidebar, MobileBottomNav, UserMenu y Footer</p>
          </div>
        </div>
      </div>

      {/* Modal de vinculación de terminal física */}
      <TerminalVinculacionModal
        isOpen={modalVinculacionAbierto}
        onClose={() => setModalVinculacionAbierto(false)}
        onSuccess={recargar}
      />
    </div>
  );
}