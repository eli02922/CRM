import { useEffect, useState, useCallback } from 'react';
import { hubspotApi } from '../api/endpoints';

export default function HubspotPage() {
  const [busy, setBusy] = useState('');
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadLogs = useCallback(async () => {
    try {
      const res = await hubspotApi.logs({ limit: 50 });
      setLogs(res.logs);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load sync logs');
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const runSync = async (kind) => {
    setBusy(kind);
    setMessage('');
    setError('');
    try {
      const fn = kind === 'contacts' ? hubspotApi.syncContacts : hubspotApi.syncDeals;
      const res = await fn();
      setMessage(`${res.message} — ${res.synced} synced${res.failed ? `, ${res.failed} skipped` : ''}`);
      loadLogs();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to sync ${kind}`);
    } finally {
      setBusy('');
    }
  };

  const runPushAll = async () => {
    setBusy('push-all');
    setMessage('');
    setError('');
    try {
      const res = await hubspotApi.pushAll();
      setMessage(`${res.message} — ${res.pushed} pushed${res.failed ? `, ${res.failed} failed` : ''}`);
      loadLogs();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to push to HubSpot');
    } finally {
      setBusy('');
    }
  };

  return (
    <div>
      <h1>HubSpot Integration</h1>
      <p className="muted">
        Pull contacts and deals into the CRM, or push CRM customers and deals back to HubSpot. Requires a valid
        token in the backend <code>.env</code> (<code>HUBSPOT_ENABLED=true</code> and <code>HUBSPOT_ACCESS_TOKEN</code>).
      </p>

      {message && <div className="alert-success">{message}</div>}
      {error && <div className="alert-error">{error}</div>}

      <div className="hubspot-actions">
        <button
          className="btn-primary"
          disabled={!!busy}
          onClick={() => runSync('contacts')}
        >
          {busy === 'contacts' ? 'Syncing…' : 'Sync Contacts'}
        </button>
        <button
          className="btn-primary"
          disabled={!!busy}
          onClick={() => runSync('deals')}
        >
          {busy === 'deals' ? 'Syncing…' : 'Sync Deals'}
        </button>
        <button
          className="btn-primary"
          disabled={!!busy}
          onClick={runPushAll}
        >
          {busy === 'push-all' ? 'Pushing…' : 'Push All to HubSpot'}
        </button>
      </div>

      <h2>Sync History</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Status</th>
            <th>Synced</th>
            <th>Error</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 && (
            <tr><td colSpan={5}>No syncs yet.</td></tr>
          )}
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{log.sync_type}</td>
              <td><span className={`badge badge-${log.status}`}>{log.status}</span></td>
              <td>{log.records_synced}</td>
              <td>{log.error_message || ''}</td>
              <td>{new Date(log.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
