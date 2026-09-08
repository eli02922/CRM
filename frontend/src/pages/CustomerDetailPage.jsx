import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { customersApi } from '../api/endpoints';

function CvSection({ customer, onChanged }) {
  const { id } = useParams();
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      await customersApi.uploadCv(id, file);
      setMessage('Resume uploaded.');
      onChanged();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Upload failed');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Remove the uploaded resume?')) return;
    setBusy(true);
    try {
      await customersApi.removeCv(id);
      setMessage('Resume removed.');
      onChanged();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2>Resume / CV</h2>
      {customer.cv_original_name ? (
        <p>
          Current file: <strong>{customer.cv_original_name}</strong>{' '}
          <a
            href={`${customersApi.cvUrl(id)}?t=${customer.updated_at}`}
            target="_blank"
            rel="noreferrer"
          >
            Download
          </a>{' '}
          <button onClick={handleDelete} disabled={busy}>Remove</button>
        </p>
      ) : (
        <p>No resume uploaded yet.</p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleUpload}
        disabled={busy}
      />
      {busy && <span> Working...</span>}
      {message && <p>{message}</p>}
    </section>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    customersApi
      .timeline(id)
      .then((d) => !cancelled && setData(d))
      .catch(() => setError('Failed to load customer'));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const refreshCustomer = async () => {
    try {
      const updated = await customersApi.get(id);
      setData((prev) => (prev ? { ...prev, customer: updated.customer } : prev));
    } catch {
      /* keep showing the old data */
    }
  };

  if (error) return <div className="alert-error">{error}</div>;
  if (!data) return <div>Loading...</div>;

  const { customer, opportunities, activities, supportCases } = data;

  return (
    <div>
      <Link to="/customers">&larr; Back to customers</Link>
      <h1>{customer.company_name}</h1>
      <p>{customer.industry} · {customer.email} · {customer.phone}</p>

      <CvSection customer={customer} onChanged={refreshCustomer} />

      <section>
        <h2>Opportunities</h2>
        <ul className="timeline-list">
          {opportunities.map((o) => (
            <li key={o.id}>
              <strong>{o.name}</strong> — {o.stage} — ${Number(o.amount).toLocaleString()}
            </li>
          ))}
          {!opportunities.length && <li>No opportunities yet.</li>}
        </ul>
      </section>

      <section>
        <h2>Activity Timeline</h2>
        <ul className="timeline-list">
          {activities.map((a) => (
            <li key={a.id}>
              <strong>{a.type}</strong>: {a.subject} {a.completed ? '✓' : ''}
            </li>
          ))}
          {!activities.length && <li>No activity yet.</li>}
        </ul>
      </section>

      <section>
        <h2>Support Cases</h2>
        <ul className="timeline-list">
          {supportCases.map((s) => (
            <li key={s.id}>
              <strong>{s.subject}</strong> — {s.status} — {s.priority}
            </li>
          ))}
          {!supportCases.length && <li>No support cases.</li>}
        </ul>
      </section>
    </div>
  );
}
