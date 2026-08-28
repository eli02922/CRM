import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { customersApi } from '../api/endpoints';

const emptyForm = { companyName: '', industry: '', email: '', phone: '', website: '' };

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const load = useCallback(
    async (page = 1) => {
      try {
        const res = await customersApi.list({ page, limit: 10, search: search || undefined });
        setCustomers(res.data);
        setPagination(res.pagination);
      } catch (err) {
        setError('Failed to load customers');
      }
    },
    [search]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await customersApi.create(form);
      setForm(emptyForm);
      load(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create customer');
    }
  };

  return (
    <div>
      <h1>Customers</h1>
      {error && <div className="alert-error">{error}</div>}

      <form className="inline-form" onSubmit={handleCreate}>
        <input placeholder="Company name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required />
        <input placeholder="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <button className="btn-primary" type="submit">Add Customer</button>
      </form>

      <div className="filters">
        <input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <table className="data-table">
        <thead>
          <tr><th>Company</th><th>Industry</th><th>Email</th><th>Phone</th><th></th></tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <td><Link to={`/customers/${c.id}`}>{c.company_name}</Link></td>
              <td>{c.industry}</td>
              <td>{c.email}</td>
              <td>{c.phone}</td>
              <td><Link to={`/customers/${c.id}`}>View 360°</Link></td>
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
