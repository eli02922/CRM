import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { customersApi } from '../api/endpoints';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    customersApi
      .timeline(id)
      .then(setData)
      .catch(() => setError('Failed to load customer'));
  }, [id]);

  if (error) return <div className="alert-error">{error}</div>;
  if (!data) return <div>Loading...</div>;

  const { customer, opportunities, activities, supportCases } = data;

  return (
    <div>
      <Link to="/customers">&larr; Back to customers</Link>
      <h1>{customer.company_name}</h1>
      <p>{customer.industry} · {customer.email} · {customer.phone}</p>

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
