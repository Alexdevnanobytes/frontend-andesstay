// Pantalla Reservas (todos los roles).
// - Huésped: crea reservas a su nombre, ve solo las suyas y puede editar o eliminar las que están en CREADA.
// - Personal (ADMIN y RECEPCIONISTA): ve todas, puede crear a nombre de un huésped y cambia los estados.
// Las reglas reales las aplican el BFF (roles y dueño) y reservations (máquina de estados).
import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
import type { Reservation, Status, Unit } from '../models';

// Siguiente estado en el flujo normal. Define qué botón de avance se muestra en cada fila
// (por ejemplo, una reserva CREADA muestra el botón "CONFIRMADA"). CANCELADA va aparte.
const transitions: Partial<Record<Status, Status>> = {
  CREADA: 'CONFIRMADA',
  CONFIRMADA: 'CHECKIN_PENDIENTE',
  CHECKIN_PENDIENTE: 'EN_ESTADIA',
  EN_ESTADIA: 'CHECKOUT'
};

// Texto del botón de avance: la acción que hace el personal, no el nombre del estado destino.
const advanceLabel: Partial<Record<Status, string>> = {
  CREADA: 'Confirmar',
  CONFIRMADA: 'Marcar llegada',
  CHECKIN_PENDIENTE: 'Registrar ingreso',
  EN_ESTADIA: 'Registrar salida'
};

// Fecha AAAA-MM-DD en formato legible, por ejemplo "12 oct 2026".
function prettyDate(value: string): string {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

// Cantidad de noches entre la entrada y la salida.
function nights(checkIn: string, checkOut: string): number {
  const ms = Date.parse(checkOut) - Date.parse(checkIn);
  return Math.round(ms / 86_400_000);
}

// Identificadores largos (UUID, oid o sub) abreviados para la tabla; el valor completo va en el tooltip.
function shortId(value: string): string {
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

// Fecha de hoy + offset días, en formato AAAA-MM-DD (el que esperan los input type=date y la API).
function date(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Texto para mostrar un estado: EN_ESTADIA -> "EN ESTADÍA" (en la API viaja sin tilde).
function label(status: Status): string {
  return status
    .replace('EN_ESTADIA', 'EN_ESTADÍA')
    .replaceAll('_', ' ');
}

export default function Reservations() {
  // Instancia de MSAL (para el token) y sesión (para saber si es personal).
  const { instance } = useMsal();
  const session = useSession();

  // Estado de la pantalla: reservas, unidades disponibles para las fechas elegidas, mensajes,
  // busy (deshabilita botones mientras hay una operación en curso) y reserva en edición.
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState('');

  // Formulario: por defecto la entrada es mañana y la salida pasado mañana.
  const [form, setForm] = useState({
    guestId: '',
    unitId: '',
    checkIn: date(1),
    checkOut: date(2)
  });

  // ¿Es personal del hotel? Cambia qué columnas y botones se muestran.
  const staff = session.has('ADMIN', 'RECEPCIONISTA');

  // Catálogo completo (solo personal: un huésped recibiría 403 en /catalog/units).
  // Se usa para mostrar el código de la unidad (H-101) en vez de su UUID.
  const [allUnits, setAllUnits] = useState<Unit[]>([]);

  useEffect(() => {
    if (!staff) return;
    api.units(instance).then(setAllUnits).catch(() => setAllUnits([]));
  }, [staff]);

  // Código de una unidad: primero del catálogo completo, luego de las unidades disponibles
  // que ya cargó el formulario; si no se conoce, el id abreviado.
  const unitCode = (unitId: string) =>
    allUnits.find(u => u.id === unitId)?.code ??
    availableUnits.find(u => u.id === unitId)?.code ??
    shortId(unitId);

  // Manejo común de errores: termina la operación en curso y muestra el mensaje.
  const fail = (e: unknown) => {
    setBusy(false);
    setError(e instanceof Error ? e.message : 'La operación falló.');
  };

  // Carga las reservas (el BFF decide si son todas o solo las propias).
  const load = async () => {
    try {
      setReservations(await api.reservations(instance));
    } catch (e) {
      fail(e);
    }
  };

  // Busca unidades disponibles para las fechas del formulario. Si la unidad elegida ya no está libre
  // en esas fechas, la deselecciona.
  const searchAvailability = async () => {
    if (
      !form.checkIn ||
      !form.checkOut ||
      form.checkIn >= form.checkOut
    ) {
      setAvailableUnits([]);
      setError('La salida debe ser posterior a la entrada.');
      return;
    }

    try {
      setError('');

      const rows = await api.available(
        instance,
        form.checkIn,
        form.checkOut
      );

      setAvailableUnits(rows);

      if (!rows.some(unit => unit.id === form.unitId)) {
        setForm(current => ({ ...current, unitId: '' }));
      }
    } catch (e) {
      fail(e);
    }
  };

  // Al abrir la pantalla: carga las reservas.
  useEffect(() => {
    void load();
  }, []);

  // Cada vez que cambian las fechas del formulario, vuelve a buscar disponibilidad.
  useEffect(() => {
    void searchAvailability();
  }, [form.checkIn, form.checkOut]);

  // Limpia el formulario y sale del modo edición.
  const reset = () => {
    setEditingId('');
    setForm({
      guestId: '',
      unitId: '',
      checkIn: date(1),
      checkOut: date(2)
    });
  };

  // Guarda la reserva: valida en el navegador, luego crea (POST) o edita (PUT).
  // Solo el personal envía guestId; si lo deja vacío, la reserva queda a su nombre.
  const save = async () => {
    setError('');
    setMessage('');

    if (!form.unitId || form.checkIn >= form.checkOut) {
      setError('Selecciona una unidad y fechas válidas.');
      return;
    }

    setBusy(true);

    try {
      const data = {
        unitId: form.unitId,
        checkIn: form.checkIn,
        checkOut: form.checkOut
      };

      if (editingId) {
        await api.updateReservation(instance, editingId, data);
      } else {
        await api.createReservation(instance, {
          ...data,
          ...(staff && form.guestId
            ? { guestId: form.guestId }
            : {})
        });
      }

      setBusy(false);
      setMessage('Reserva guardada.');
      reset();
      await load();
    } catch (e) {
      fail(e);
    }
  };

  // Carga una reserva en el formulario para editarla (solo reservas CREADA).
  const edit = (row: Reservation) => {
    setEditingId(row.id);

    setForm({
      guestId: row.guestId,
      unitId: row.unitId,
      checkIn: row.checkIn,
      checkOut: row.checkOut
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cambia el estado de una reserva (PATCH, solo personal). Si la transición no es válida, la API responde 409.
  // Después recarga la lista y la disponibilidad, porque confirmar ocupa la unidad y cancelar la libera.
  const changeStatus = async (
    row: Reservation,
    status: Status
  ) => {
    setError('');
    setMessage('');
    setBusy(true);

    try {
      await api.changeStatus(instance, row.id, status);

      setBusy(false);
      setMessage(`Reserva actualizada a ${label(status)}.`);

      await load();
      await searchAvailability();
    } catch (e) {
      fail(e);
    }
  };

  // Elimina una reserva, previa confirmación.
  const remove = async (row: Reservation) => {
    if (!window.confirm('¿Eliminar esta reserva?')) return;

    setBusy(true);

    try {
      await api.deleteReservation(instance, row.id);
      setBusy(false);
      setMessage('Reserva eliminada.');
      await load();
    } catch (e) {
      fail(e);
    }
  };

  // Se puede eliminar solo si está CREADA o CANCELADA (misma regla que en reservations).
  const canDelete = (row: Reservation) =>
    row.status === 'CREADA' || row.status === 'CANCELADA';

  // Solo el personal puede cancelar, y solo antes de EN_ESTADIA (misma regla que en reservations).
  const canCancel = (row: Reservation) =>
    staff &&
    (
      row.status === 'CREADA' ||
      row.status === 'CONFIRMADA' ||
      row.status === 'CHECKIN_PENDIENTE'
    );

  // Estructura: encabezado, avisos, formulario de reserva y tabla de reservas.
  return (
    <>
      <section className="page-heading">
        <div className="eyebrow">OPERACIÓN</div>
        <h1>Reservas</h1>
        <p>Consulta fechas y sigue el estado de cada estadía.</p>
      </section>

      {/* Avisos de error (rojo) y de éxito (verde). */}
      {error && <div className="alert">{error}</div>}
      {message && <div className="success">{message}</div>}

      {/* Formulario para crear o editar una reserva. */}
      <section className="card">
        <h2>
          {editingId ? 'Editar reserva creada' : 'Nueva reserva'}
        </h2>

        <div className="form-grid">
          <label>
            Entrada
            <input
              type="date"
              value={form.checkIn}
              onChange={e =>
                setForm({ ...form, checkIn: e.target.value })
              }
            />
          </label>

          <label>
            Salida
            <input
              type="date"
              value={form.checkOut}
              onChange={e =>
                setForm({ ...form, checkOut: e.target.value })
              }
            />
          </label>

          {/* Selector de unidad: solo lista las unidades libres para las fechas elegidas. */}
          <label>
            Unidad disponible
            <select
              value={form.unitId}
              onChange={e =>
                setForm({ ...form, unitId: e.target.value })
              }
            >
              <option value="">Selecciona una unidad</option>

              {availableUnits.map(unit => (
                <option key={unit.id} value={unit.id}>
                  {unit.code} · {unit.type} · $
                  {unit.nightlyRate.toLocaleString('es-CL')}
                </option>
              ))}
            </select>
          </label>

          {/* Campo ID del huésped: solo el personal, y solo al crear. */}
          {staff && !editingId && (
            <label>
              ID del huésped (opcional)
              <input
                value={form.guestId}
                placeholder="ID del usuario (Entra o Cognito). Vacío = a tu nombre"
                onChange={e =>
                  setForm({ ...form, guestId: e.target.value })
                }
              />
            </label>
          )}
        </div>

        {/* Botones Guardar y Cancelar edición. busy evita dobles envíos. */}
        <div className="actions">
          <button
            className="primary"
            disabled={busy || !form.unitId}
            onClick={() => void save()}
          >
            {editingId ? 'Guardar cambios' : 'Crear reserva'}
          </button>

          {editingId && (
            <button
              className="secondary"
              onClick={reset}
            >
              Cancelar edición
            </button>
          )}
        </div>

        <p className="hint">
          La unidad queda ocupada al confirmar; crear una reserva
          no reduce su disponibilidad.
        </p>
      </section>

      {/* Tabla de reservas: el título y la columna Huésped cambian según el rol. */}
      <section className="card">
        <div className="section-row">
          <h2>
            {staff ? 'Todas las reservas' : 'Mis reservas'}
          </h2>

          <span>{reservations.length} resultado(s)</span>
        </div>

        {/* Mensaje cuando no hay reservas. */}
        {!reservations.length && (
          <p>Todavía no hay reservas.</p>
        )}

        {!!reservations.length && (
          <div className="table-scroll">
            <table className="reservations-table">
              <thead>
                <tr>
                  <th>Unidad</th>
                  {staff && <th>Huésped</th>}
                  <th>Estadía</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {/* Una fila por reserva, con sus botones de acción. */}
                {reservations.map(row => {
                  // Siguiente estado posible para mostrar el botón de avance.
                  const next = transitions[row.status];
                  // Qué botones corresponden a esta fila (mismas reglas que el backend).
                  const showAdvance = staff && Boolean(next);
                  const showEdit = row.status === 'CREADA';
                  const showCancel = canCancel(row);
                  const showDelete = canDelete(row);
                  const noActions =
                    !showAdvance && !showEdit && !showCancel && !showDelete;
                  const stay = nights(row.checkIn, row.checkOut);

                  return (
                    <tr key={row.id}>
                      <td>
                        <span className="unit-code" title={row.unitId}>
                          {unitCode(row.unitId)}
                        </span>
                      </td>

                      {staff && (
                        <td>
                          <span className="id-chip" title={row.guestId}>
                            {shortId(row.guestId)}
                          </span>
                        </td>
                      )}

                      {/* Fechas legibles y cantidad de noches. */}
                      <td>
                        <div className="stay-dates">
                          {prettyDate(row.checkIn)} → {prettyDate(row.checkOut)}
                        </div>
                        <div className="stay-nights">
                          {stay} {stay === 1 ? 'noche' : 'noches'}
                        </div>
                      </td>

                      {/* Cada estado tiene su color (clase status-<estado>). */}
                      <td>
                        <span className={`badge status-${row.status.toLowerCase()}`}>
                          {label(row.status)}
                        </span>
                      </td>

                      <td>
                        <div className="row-actions">
                          {/* Avanzar al siguiente estado: acción principal, solo personal. */}
                          {showAdvance && next && (
                            <button
                              className="action action-advance"
                              disabled={busy}
                              title={`Pasa la reserva a ${label(next)}`}
                              onClick={() =>
                                void changeStatus(row, next)
                              }
                            >
                              {advanceLabel[row.status]} →
                            </button>
                          )}

                          {/* Editar: solo reservas CREADA. */}
                          {showEdit && (
                            <button
                              className="action action-neutral"
                              disabled={busy}
                              title="Cambiar unidad o fechas"
                              onClick={() => edit(row)}
                            >
                              Editar
                            </button>
                          )}

                          {/* Cancelar: solo personal y antes de EN_ESTADIA. */}
                          {showCancel && (
                            <button
                              className="action action-warn"
                              disabled={busy}
                              title="Anula la reserva y libera la unidad"
                              onClick={() =>
                                void changeStatus(
                                  row,
                                  'CANCELADA'
                                )
                              }
                            >
                              Cancelar
                            </button>
                          )}

                          {/* Eliminar: reservas CREADA o CANCELADA. */}
                          {showDelete && (
                            <button
                              className="action action-danger"
                              disabled={busy}
                              title="Borra la reserva definitivamente"
                              onClick={() => void remove(row)}
                            >
                              Eliminar
                            </button>
                          )}

                          {/* Reservas terminadas o sin acciones para este rol. */}
                          {noActions && (
                            <span className="no-actions">Sin acciones</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
