import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import type { TerminalGestionItem } from '@/features/terminales/api/terminales-api';

export interface TerminalesTablaProps {
  items: TerminalGestionItem[];
  isLoading: boolean;
  totalItems: number;
  toolbar: React.ReactNode;
  generandoOtpId: number | null;
  onSolicitarOtp: (terminal: TerminalGestionItem) => void;
  onAbrirReasignar: (terminal: TerminalGestionItem) => void;
  onAbrirRevocar: (terminal: TerminalGestionItem) => void;
}

export function TerminalesTabla({
  items,
  isLoading,
  totalItems,
  toolbar,
  generandoOtpId,
  onSolicitarOtp,
  onAbrirReasignar,
  onAbrirRevocar,
}: TerminalesTablaProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-app-surface border border-border rounded-xl shadow-xs overflow-hidden">
      {/* Barra de herramientas integrada */}
      <div className="p-3 border-b border-border/80 bg-app-surface">{toolbar}</div>

      {/* Contenedor scrolleable */}
      <div className="flex-1 overflow-auto min-h-[300px]">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead className="sticky top-0 z-10 bg-slate-100 border-b border-border text-[11px] font-bold uppercase tracking-wider text-text-secondary select-none">
            <tr>
              <th className="py-2.5 px-4">Terminal</th>
              <th className="py-2.5 px-4">Departamento de Captura</th>
              <th className="py-2.5 px-4">Estado</th>
              <th className="py-2.5 px-4">Último Acceso</th>
              <th className="py-2.5 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  <div className="inline-flex items-center gap-2 text-text-muted">
                    <Spinner size="md" />
                    <span>Cargando terminales físicas...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-text-muted">
                  <Icon name="devices" size="32px" className="mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="font-semibold text-slate-700">No se encontraron terminales</p>
                  <p className="text-[11px] text-slate-400">Intente modificando el término de búsqueda o filtros</p>
                </td>
              </tr>
            ) : (
              items.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="font-bold text-slate-900 font-mono text-xs">{t.nombre}</div>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="font-bold text-marca-primario uppercase text-xs">
                      {t.departamento?.nombre || 'Sin Asignar'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    {t.estado === 'ACTIVO' && !t.fechaRevocacion ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                        Revocada / Inactiva
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 text-[11px] font-mono">
                    {t.fechaUltimoAcceso
                      ? new Date(t.fechaUltimoAcceso).toLocaleString('es-MX', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : 'Nunca'}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      {t.estado === 'ACTIVO' && !t.fechaRevocacion ? (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => onSolicitarOtp(t)}
                            disabled={generandoOtpId === t.id}
                            className="h-7 text-xs font-semibold px-2.5 bg-brand-primary text-white shadow-2xs cursor-pointer"
                            title="Generar código OTP para vincular en la estación física"
                          >
                            {generandoOtpId === t.id ? (
                              <Spinner size="xs" />
                            ) : (
                              <>
                                <Icon name="key" size="14px" className="mr-1" />
                                <span>Generar OTP</span>
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAbrirReasignar(t)}
                            className="h-7 text-xs px-2 text-slate-700 bg-white border-slate-300 hover:bg-slate-50 cursor-pointer"
                            title="Reasignar departamento de captura"
                          >
                            <Icon name="swap_horiz" size="14px" className="mr-1 text-slate-500" />
                            <span>Reasignar</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => onAbrirRevocar(t)}
                            className="h-7 text-xs px-2 cursor-pointer"
                            title="Revocar credencial y bloquear estación"
                          >
                            <Icon name="block" size="14px" className="mr-1" />
                            <span>Revocar</span>
                          </Button>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Sin acciones</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer de conteo */}
      <div className="flex items-center justify-between p-3.5 border-t border-border bg-app-surface text-xs rounded-b-xl select-none">
        <span className="text-text-secondary">
          Mostrando <strong className="text-text-primary font-bold">{items.length}</strong> de{' '}
          <strong className="text-text-primary font-bold">{totalItems}</strong> terminales físicas registradas
        </span>
      </div>
    </div>
  );
}
