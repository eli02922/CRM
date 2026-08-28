import { useEffect, useState, useCallback } from 'react';
import { leadsApi } from '../api/endpoints';

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'unqualified', 'converted'];
const emptyForm = { firstName: '', lastName: '', email: '', phone: '', company: '', source: '' };

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const load = useCallback(
    async (page = 1) => {
      try {
        const res = await leadsApi.list({ page, limit: 10, status: status || undefined, search: search || undefined });
        setLeads(res.data);
        setPagination(res.pagination);
      } catch (err) {
        setError('Failed to load leads');
      }
    },
    [status, search]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await leadsApi.create(form);
      setForm(emptyForm);
      load(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create lead');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    await leadsApi.update(id, { status: newStatus });
    load(pagination.page);
  };

  const handleConvert = async (id) => {
    await leadsApi.convert(id, {});
    load(pagination.page);
  };

  return (
    <div>
      <h1>Leads</h1>
      {error && <div className="alert-error">{error}</div>}

      <form className="inline-form" onSubmit={handleCreate}>
        <input placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
        <input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <input placeholder="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
        <button className="btn-primary" type="submit">Add Lead</button>
      </form>

      <div className="filters">
        <input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th><th>Company</th><th>Email</th><th>Status</th><th>Score</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td>{lead.first_name} {lead.last_name}</td>
              <td>{lead.company}</td>
              <td>{lead.email}</td>
              <td>
                <select value={lead.status} onChange={(e) => handleStatusChange(lead.id, e.target.value)}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td>{lead.score}</td>
              <td>
                {lead.status !== 'converted' && (
                  <button className="btn-secondary" onClick={() => handleConvert(lead.id)}>Convert</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pager pagination={pagination} onPageChange={load} />
    </div>
  );
}

function Pager({ pagination, onPageChange }) {
  return (
    <div className="pager">
      <button disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>Prev</button>
      <span>Page {pagination.page} of {pagination.totalPages}</span>
      <button disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)}>Next</button>
    </div>
  );
}
