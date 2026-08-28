import { useEffect, useState, useCallback } from 'react';
import { activitiesApi } from '../api/endpoints';

const emptyForm = { type: 'task', subject: '', notes: '', dueDate: '' };

export default function ActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const load = useCallback(async (page = 1) => {
    try {
      const res = await activitiesApi.list({ page, limit: 10 });
      setActivities(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError('Failed to load activities');
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await activitiesApi.create(form);
      setForm(emptyForm);
      load(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create activity');
    }
  };

  const toggleComplete = async (activity) => {
    await activitiesApi.update(activity.id, { completed: !activity.completed });
    load(pagination.page);
  };

  return (
    <div>
      <h1>Activities &amp; Task Reminders</h1>
      {error && <div className="alert-error">{error}</div>}

      <form className="inline-form" onSubmit={handleCreate}>
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="task">Task</option>
          <option value="call">Call</option>
          <option value="email">Email</option>
          <option value="meeting">Meeting</option>
          <option value="note">Note</option>
        </select>
        <input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
        <input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        <button className="btn-primary" type="submit">Add Activity</button>
      </form>

      <table className="data-table">
        <thead>
          <tr><th>Type</th><th>Subject</th><th>Due</th><th>Completed</th></tr>
        </thead>
        <tbody>
          {activities.map((a) => (
            <tr key={a.id}>
              <td>{a.type}</td>
              <td>{a.subject}</td>
              <td>{a.due_date ? new Date(a.due_date).toLocaleString() : '—'}</td>
              <td>
                <input type="checkbox" checked={a.completed} onChange={() => toggleComplete(a)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pager">
        <button disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>Prev</button>
        <span>Page {pagination.page} of {pagination.totalPages}</span>
        <button disabled={pagination.page >= pagination.totalPages} onClick={() => load(pagination.page + 1)}>Next</button>
      </div>
    </div>
  );
}
