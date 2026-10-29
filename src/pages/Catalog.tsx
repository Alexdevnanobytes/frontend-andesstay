// Pantalla Catálogo (solo ADMIN y RECEPCIONISTA; App ni siquiera la muestra a un huésped).
// - Todo el personal ve las unidades y puede buscar disponibilidad por fechas.
// - Solo ADMIN ve el formulario para crear o editar y los botones Editar y Desactivar.
// Si otro rol intentara esas acciones igual, el BFF respondería 403.
import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
import type { Unit } from '../models';

export default function Catalog() {
  // Instancia de MSAL (para obtener el token) y sesión (para revisar roles).
  const { instance } = useMsal();
  const session = useSession();

  // Estado de la pantalla: unidades registradas, unidades disponibles en la búsqueda, mensajes,
  // unidad que se está editando (vacío = creando una nueva) y fechas de búsqueda.
  const [units, setUnits] = useState<Unit[]>([]);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Datos del formulario de unidad.
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

  // Carga todas las unidades (GET /catalog/units). Si falla, muestra el error.
  const load = async () => {
    try {
      setUnits(await api.units(instance));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión.');
    }
  };

  // Al abrir la pantalla, carga las unidades una sola vez (arreglo de dependencias vacío).
  useEffect(() => {
    void load();
  }, []);

  // Busca unidades disponibles entre dos fechas. Primero valida en el navegador que la salida
  // sea posterior a la entrada; el backend lo valida otra vez (400).
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

  // Limpia el formulario y sale del modo edición.
  const reset = () => {
    setEditingId('');
    setForm({
      code: '',
      type: 'HABITACION',
      description: '',
      nightlyRate: 0
    });
  };

  // Guarda: si hay una unidad en edición la actualiza (PUT); si no, crea una nueva (POST).
  // Después recarga la lista. Si el código está repetido, el backend responde 409 y se muestra el error.
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

  // Pasa una unidad al formulario para editarla y sube la página hasta el formulario.
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

  // Desactiva una unidad (DELETE), previa confirmación. Si tiene reservas activas, el backend responde 409.
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

  // Estructura de la pantalla: encabezado, avisos, formulario (solo ADMIN), búsqueda por fechas y tabla.
  return (
    <>
      <section className="page-heading">
        <div className="eyebrow">INVENTARIO</div>
        <h1>Catálogo de unidades</h1>
        <p>
          Habitaciones, cabañas, tarifas y disponibilidad por fecha.
        </p>
      </section>

      {/* Avisos de error (rojo) y de éxito (verde). */}
      {error && <div className="alert">{error}</div>}
      {message && <div className="success">{message}</div>}

      {/* Formulario de creación y edición: solo visible para ADMIN. */}
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

          {/* Botón Guardar y, si se está editando, botón Cancelar edición. */}
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

      {/* Búsqueda de disponibilidad por fechas (GET /catalog/available). */}
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

      {/* Tabla de unidades registradas. La columna Acciones solo aparece para ADMIN. */}
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
              {/* Una fila por unidad; key ayuda a React a identificar cada fila al actualizar la tabla. */}
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

                  {/* Botones Editar y Desactivar: solo ADMIN y solo en unidades activas. */}
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
