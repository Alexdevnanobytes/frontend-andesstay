import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
import type { Reservation, Status, Unit } from '../models';

const transitions: Partial<Record<Status, Status>> = {
  CREADA: 'CONFIRMADA',
  CONFIRMADA: 'CHECKIN_PENDIENTE',
  CHECKIN_PENDIENTE: 'EN_ESTADIA',
  EN_ESTADIA: 'CHECKOUT'
};

function date(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function label(status: Status): string {
  return status
    .replace('EN_ESTADIA', 'EN_ESTADÍA')
    .replaceAll('_', ' ');
}

export default function Reservations() {
  const { instance } = useMsal();
  const session = useSession();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState('');

  const [form, setForm] = useState({
    guestId: '',
    unitId: '',
    checkIn: date(1),
    checkOut: date(2)
  });

  const staff = session.has('ADMIN', 'RECEPCIONISTA');

  const fail = (e: unknown) => {
    setBusy(false);
    setError(e instanceof Error ? e.message : 'La operación falló.');
  };

  const load = async () => {
    try {
      setReservations(await api.reservations(instance));
    } catch (e) {
      fail(e);
    }
  };

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

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    void searchAvailability();
  }, [form.checkIn, form.checkOut]);

  const reset = () => {
    setEditingId('');
    setForm({
      guestId: '',
      unitId: '',
      checkIn: date(1),
      checkOut: date(2)
    });
  };

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

  const canDelete = (row: Reservation) =>
    row.status === 'CREADA' || row.status === 'CANCELADA';

  const canCancel = (row: Reservation) =>
    staff &&
    (
      row.status === 'CREADA' ||
      row.status === 'CONFIRMADA' ||
      row.status === 'CHECKIN_PENDIENTE'
    );

  return (
    <>
      <section className="page-heading">
        <div className="eyebrow">OPERACIÓN</div>
        <h1>Reservas</h1>
        <p>Consulta fechas y sigue el estado de cada estadía.</p>
      </section>

      {error && <div className="alert">{error}</div>}
      {message && <div className="success">{message}</div>}

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

      <section className="card">
        <div className="section-row">
          <h2>
            {staff ? 'Todas las reservas' : 'Mis reservas'}
          </h2>

          <span>{reservations.length} resultado(s)</span>
        </div>

        {!reservations.length && (
          <p>Todavía no hay reservas.</p>
        )}

        {!!reservations.length && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Unidad</th>
                  {staff && <th>Huésped</th>}
                  <th>Fechas</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {reservations.map(row => {
                  const next = transitions[row.status];

                  return (
                    <tr key={row.id}>
                      <td>{row.unitId}</td>

                      {staff && <td>{row.guestId}</td>}

                      <td>
                        {row.checkIn} → {row.checkOut}
                      </td>

                      <td>
                        <span className="badge">
                          {label(row.status)}
                        </span>
                      </td>

                      <td>
                        <div className="row-actions">
                          {row.status === 'CREADA' && (
                            <button
                              disabled={busy}
                              onClick={() => edit(row)}
                            >
                              Editar
                            </button>
                          )}

                          {staff && next && (
                            <button
                              disabled={busy}
                              onClick={() =>
                                void changeStatus(row, next)
                              }
                            >
                              {label(next)}
                            </button>
                          )}

                          {canCancel(row) && (
                            <button
                              disabled={busy}
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

                          {canDelete(row) && (
                            <button
                              disabled={busy}
                              onClick={() => void remove(row)}
                            >
                              Eliminar
                            </button>
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
