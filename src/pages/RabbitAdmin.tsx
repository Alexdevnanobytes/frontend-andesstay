import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import {
  api,
  type RabbitQueue,
  type RabbitExchange,
  type RabbitBinding
} from '../services/api';

type ResourceTab = 'queues' | 'exchanges' | 'bindings';

const tabs: { id: ResourceTab; label: string }[] = [
  { id: 'queues', label: 'Colas' },
  { id: 'exchanges', label: 'Exchanges' },
  { id: 'bindings', label: 'Bindings' }
];

export default function RabbitAdmin() {
  const { instance } = useMsal();

  const [activeTab, setActiveTab] = useState<ResourceTab>('queues');
  const [queues, setQueues] = useState<RabbitQueue[]>([]);
  const [exchanges, setExchanges] = useState<RabbitExchange[]>([]);
  const [bindings, setBindings] = useState<RabbitBinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [queueName, setQueueName] = useState('');
  const [queueDurable, setQueueDurable] = useState(true);
  const [deadLetterExchange, setDeadLetterExchange] = useState('');
  const [deadLetterRoutingKey, setDeadLetterRoutingKey] = useState('');

  const [exchangeName, setExchangeName] = useState('');
  const [exchangeType, setExchangeType] =
    useState<'direct' | 'topic'>('direct');
  const [exchangeDurable, setExchangeDurable] = useState(true);

  const [bindingExchange, setBindingExchange] = useState('');
  const [bindingQueue, setBindingQueue] = useState('');
  const [bindingRoutingKey, setBindingRoutingKey] = useState('');

  async function loadResources() {
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'queues') {
        setQueues(await api.rabbitQueues(instance));
      } else if (activeTab === 'exchanges') {
        setExchanges(await api.rabbitExchanges(instance));
      } else {
        const [nextBindings, nextQueues, nextExchanges] =
          await Promise.all([
            api.rabbitBindings(instance),
            api.rabbitQueues(instance),
            api.rabbitExchanges(instance)
          ]);

        setBindings(nextBindings);
        setQueues(nextQueues);
        setExchanges(nextExchanges);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los recursos de RabbitMQ.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadResources();
    // Se recargan los datos cuando se cambia de pestaña.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, instance]);

  async function runAction(action: () => Promise<unknown>, success: string) {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await action();
      setMessage(success);
      await loadResources();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo completar la operación.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitQueue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data: RabbitQueue = {
      name: queueName.trim(),
      durable: queueDurable,
      ...(deadLetterExchange.trim()
        ? { deadLetterExchange: deadLetterExchange.trim() }
        : {}),
      ...(deadLetterRoutingKey.trim()
        ? { deadLetterRoutingKey: deadLetterRoutingKey.trim() }
        : {})
    };

    await runAction(
      () => api.createRabbitQueue(instance, data),
      'Cola creada correctamente.'
    );

    setQueueName('');
    setDeadLetterExchange('');
    setDeadLetterRoutingKey('');
  }

  async function submitExchange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data: RabbitExchange = {
      name: exchangeName.trim(),
      type: exchangeType,
      durable: exchangeDurable
    };

    await runAction(
      () => api.createRabbitExchange(instance, data),
      'Exchange creado correctamente.'
    );

    setExchangeName('');
  }

  async function submitBinding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data: RabbitBinding = {
      exchange: bindingExchange,
      queue: bindingQueue,
      routingKey: bindingRoutingKey
    };

    await runAction(
      () => api.createRabbitBinding(instance, data),
      'Binding creado correctamente.'
    );

    setBindingRoutingKey('');
  }

  function confirmDelete(description: string): boolean {
    return window.confirm(`¿Seguro que deseas eliminar ${description}?`);
  }

  return (
    <div className="rabbit-page">
      <section className="page-heading">
        <div className="eyebrow">ADMINISTRACIÓN</div>
        <h1>RabbitMQ</h1>
        <p>
          Administra las colas, los exchanges y sus vinculaciones
          desde AndesStay.
        </p>
      </section>

      <section className="rabbit-card">
        <div className="rabbit-card-heading">
          <div>
            <h2>Recursos de mensajería</h2>
            <p>Consulta y administra los recursos del broker.</p>
          </div>

          <span className="rabbit-status">
            {loading ? 'Cargando…' : 'Conexión por API'}
          </span>
        </div>

        <div className="rabbit-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={
                activeTab === tab.id
                  ? 'rabbit-tab active'
                  : 'rabbit-tab'
              }
              onClick={() => {
                setActiveTab(tab.id);
                setMessage('');
                setError('');
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rabbit-alert rabbit-alert-error" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="rabbit-alert rabbit-alert-success" role="status">
            {message}
          </div>
        )}

        <div className="rabbit-content">
          {activeTab === 'queues' && (
            <>
              <form className="rabbit-form" onSubmit={submitQueue}>
                <h3>Crear cola</h3>

                <label>
                  Nombre
                  <input
                    value={queueName}
                    onChange={(e) => setQueueName(e.target.value)}
                    required
                    maxLength={200}
                    placeholder="Ej. reservations.events"
                  />
                </label>

                <label className="rabbit-checkbox">
                  <input
                    type="checkbox"
                    checked={queueDurable}
                    onChange={(e) => setQueueDurable(e.target.checked)}
                  />
                  Cola durable
                </label>

                <label>
                  Dead-letter exchange (opcional)
                  <input
                    value={deadLetterExchange}
                    onChange={(e) => setDeadLetterExchange(e.target.value)}
                    placeholder="Nombre del exchange"
                  />
                </label>

                <label>
                  Dead-letter routing key (opcional)
                  <input
                    value={deadLetterRoutingKey}
                    onChange={(e) => setDeadLetterRoutingKey(e.target.value)}
                    placeholder="Clave de enrutamiento"
                  />
                </label>

                <button className="rabbit-primary" disabled={saving} type="submit">
                  {saving ? 'Procesando…' : 'Crear cola'}
                </button>
              </form>

              <div className="rabbit-list-heading">
                <h3>Colas existentes</h3>
                <button type="button" onClick={() => void loadResources()} disabled={loading}>
                  Actualizar
                </button>
              </div>

              {loading ? (
                <p>Cargando colas…</p>
              ) : queues.length === 0 ? (
                <p>No hay colas para mostrar.</p>
              ) : (
                <div className="rabbit-resource-list">
                  {queues.map((queue) => (
                    <article className="rabbit-resource" key={queue.name}>
                      <div>
                        <strong>{queue.name}</strong>
                        <p>Durable: {queue.durable ? 'Sí' : 'No'}</p>
                        {queue.deadLetterExchange && (
                          <p>DLX: {queue.deadLetterExchange}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="rabbit-danger"
                        disabled={saving}
                        onClick={() => {
                          if (confirmDelete(`la cola "${queue.name}"`)) {
                            void runAction(
                              () => api.deleteRabbitQueue(instance, queue.name),
                              'Cola eliminada correctamente.'
                            );
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'exchanges' && (
            <>
              <form className="rabbit-form" onSubmit={submitExchange}>
                <h3>Crear exchange</h3>

                <label>
                  Nombre
                  <input
                    value={exchangeName}
                    onChange={(e) => setExchangeName(e.target.value)}
                    required
                    maxLength={200}
                    placeholder="Ej. reservations.events"
                  />
                </label>

                <label>
                  Tipo
                  <select
                    value={exchangeType}
                    onChange={(e) =>
                      setExchangeType(e.target.value as 'direct' | 'topic')
                    }
                  >
                    <option value="direct">direct</option>
                    <option value="topic">topic</option>
                  </select>
                </label>

                <label className="rabbit-checkbox">
                  <input
                    type="checkbox"
                    checked={exchangeDurable}
                    onChange={(e) => setExchangeDurable(e.target.checked)}
                  />
                  Exchange durable
                </label>

                <button className="rabbit-primary" disabled={saving} type="submit">
                  {saving ? 'Procesando…' : 'Crear exchange'}
                </button>
              </form>

              <div className="rabbit-list-heading">
                <h3>Exchanges existentes</h3>
                <button type="button" onClick={() => void loadResources()} disabled={loading}>
                  Actualizar
                </button>
              </div>

              {loading ? (
                <p>Cargando exchanges…</p>
              ) : exchanges.length === 0 ? (
                <p>No hay exchanges para mostrar.</p>
              ) : (
                <div className="rabbit-resource-list">
                  {exchanges.map((exchange) => (
                    <article className="rabbit-resource" key={exchange.name}>
                      <div>
                        <strong>{exchange.name}</strong>
                        <p>Tipo: {exchange.type}</p>
                        <p>Durable: {exchange.durable ? 'Sí' : 'No'}</p>
                      </div>
                      <button
                        type="button"
                        className="rabbit-danger"
                        disabled={saving}
                        onClick={() => {
                          if (confirmDelete(`el exchange "${exchange.name}"`)) {
                            void runAction(
                              () => api.deleteRabbitExchange(instance, exchange.name),
                              'Exchange eliminado correctamente.'
                            );
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'bindings' && (
            <>
              <form className="rabbit-form" onSubmit={submitBinding}>
                <h3>Crear binding</h3>

                <label>
                  Exchange
                  <select
                    value={bindingExchange}
                    onChange={(e) => setBindingExchange(e.target.value)}
                    required
                  >
                    <option value="">Selecciona un exchange</option>
                    {exchanges.map((exchange) => (
                      <option key={exchange.name} value={exchange.name}>
                        {exchange.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Cola de destino
                  <select
                    value={bindingQueue}
                    onChange={(e) => setBindingQueue(e.target.value)}
                    required
                  >
                    <option value="">Selecciona una cola</option>
                    {queues.map((queue) => (
                      <option key={queue.name} value={queue.name}>
                        {queue.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Routing key
                  <input
                    value={bindingRoutingKey}
                    onChange={(e) => setBindingRoutingKey(e.target.value)}
                    placeholder="Ej. reservations.created"
                  />
                </label>

                <button
                  className="rabbit-primary"
                  disabled={saving || !exchanges.length || !queues.length}
                  type="submit"
                >
                  {saving ? 'Procesando…' : 'Crear binding'}
                </button>
              </form>

              <div className="rabbit-list-heading">
                <h3>Bindings existentes</h3>
                <button type="button" onClick={() => void loadResources()} disabled={loading}>
                  Actualizar
                </button>
              </div>

              {loading ? (
                <p>Cargando bindings…</p>
              ) : bindings.length === 0 ? (
                <p>No hay bindings para mostrar.</p>
              ) : (
                <div className="rabbit-resource-list">
                  {bindings.map((binding, index) => (
                    <article
                      className="rabbit-resource"
                      key={`${binding.exchange}-${binding.queue}-${binding.routingKey}-${index}`}
                    >
                      <div>
                        <strong>{binding.exchange} → {binding.queue}</strong>
                        <p>Routing key: {binding.routingKey || '(vacía)'}</p>
                      </div>
                      <button
                        type="button"
                        className="rabbit-danger"
                        disabled={saving}
                        onClick={() => {
                          if (
                            confirmDelete(
                              `el binding "${binding.exchange} → ${binding.queue}"`
                            )
                          ) {
                            void runAction(
                              () => api.deleteRabbitBinding(instance, binding),
                              'Binding eliminado correctamente.'
                            );
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <p className="rabbit-security-note">
        Acceso restringido a administradores. El backend debe validar
        los permisos de cada operación.
      </p>
    </div>
  );
}
