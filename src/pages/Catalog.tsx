import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
import type { Unit } from '../models';

export default function Catalog() {
  const { instance } = useMsal();
  const session = useSession();

  const [units, setUnits] = useState<Unit[]>([]);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [form, setForm] = useState<{
    code: string;
    type: 'HABITACION' | 'CABANA';
    description: string;
    nightlyRate: number;
  }>({
    code: '',
    type: 'HABITACION',
    description: '',
    nightlyRate: 0
  });

  const load = async () => {
    try {
      setUnits(await api.units(instance));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const search = async () => {
    if (!from || !to || from >= to) {
      setError('Selecciona fechas válidas.');
      return;
    }

    try {
      setError('');
      setAvailableUnits(
        await api.available(instance, from, to)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión.');
    }
  };

  const reset = () => {
    setEditingId('');
    setForm({
      code: '',
      type: 'HABITACION',
      description: '',
      nightlyRate: 0
    });
  };

  const save = async () => {
    setError('');
    setMessage('');

    try {
      if (editingId) {
        await api.updateUnit(instance, editingId, form);
      } else {
        await api.createUnit(instance, form);
      }

      setMessage('Unidad guardada.');
      reset();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión.');
    }
  };

  const edit = (unit: Unit) => {
    setEditingId(unit.id);

    setForm({
      code: unit.code,
      type: unit.type,
      description: unit.description,
      nightlyRate: unit.nightlyRate
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (unit: Unit) => {
    if (!window.confirm(`¿Desactivar ${unit.code}?`)) return;

    try {
      await api.deleteUnit(instance, unit.id);
      setMessage('Unidad desactivada.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión.');
    }
  };

  return (
    <>
      <section className="page-heading">
        <div className="eyebrow">INVENTARIO</div>
        <h1>Catálogo de unidades</h1>
        <p>
          Habitaciones, cabañas, tarifas y disponibilidad por fecha.
        </p>
      </section>

      {error && <div className="alert">{error}</div>}
      {message && <div className="success">{message}</div>}

      {session.has('ADMIN') && (
        <section className="card">
          <h2>
            {editingId ? 'Editar unidad' : 'Agregar unidad'}
          </h2>

          <div className="form-grid">
            <label>
              Código
              <input
                value={form.code}
                placeholder="H-101"
                onChange={e =>
                  setForm({ ...form, code: e.target.value })
                }
              />
            </label>

            <label>
              Tipo
              <select
                value={form.type}
                onChange={e =>
                  setForm({
                    ...form,
                    type: e.target.value as
                      | 'HABITACION'
                      | 'CABANA'
                  })
                }
              >
                <option value="HABITACION">
                  Habitación
                </option>
                <option value="CABANA">Cabaña</option>
              </select>
            </label>

            <label>
              Descripción
              <input
                value={form.description}
                placeholder="Vista a la cordillera"
                onChange={e =>
                  setForm({
                    ...form,
                    description: e.target.value
                  })
                }
              />
            </label>

            <label>
              Tarifa por noche ($)
              <input
                type="number"
                min="1"
                value={form.nightlyRate}
                onChange={e =>
                  setForm({
                    ...form,
                    nightlyRate: Number(e.target.value)
                  })
                }
              />
            </label>
          </div>

          <div className="actions">
            <button
              className="primary"
              disabled={
                !form.code ||
                !form.description ||
                form.nightlyRate <= 0
              }
              onClick={() => void save()}
            >
              Guardar unidad
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
        </section>
      )}

      <section className="card">
        <h2>Disponibilidad</h2>

        <div className="form-grid">
          <label>
            Entrada
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
            />
          </label>

          <label>
            Salida
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
            />
          </label>
        </div>

        <button
          className="primary"
          onClick={() => void search()}
        >
          Consultar
        </button>

        {from && to && (
          <p className="hint">
            {availableUnits.length} unidad(es) disponibles para esas
            fechas.
          </p>
        )}
      </section>

      <section className="card">
        <div className="section-row">
          <h2>Unidades</h2>
          <span>{units.length} registradas</span>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Tarifa</th>
                <th>Estado</th>
                {session.has('ADMIN') && <th>Acciones</th>}
              </tr>
            </thead>

            <tbody>
              {units.map(unit => (
                <tr key={unit.id}>
                  <td>{unit.code}</td>
                  <td>{unit.type}</td>
                  <td>{unit.description}</td>
                  <td>
                    ${unit.nightlyRate.toLocaleString('es-CL')}
                  </td>
                  <td>
                    <span className="badge">
                      {unit.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>

                  {session.has('ADMIN') && (
                    <td>
                      <div className="row-actions">
                        {unit.active && (
                          <>
                            <button onClick={() => edit(unit)}>
                              Editar
                            </button>

                            <button
                              onClick={() => void remove(unit)}
                            >
                              Desactivar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
