import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>404</h1>
        <p>Page not found.</p>
        <Link to="/">Go home</Link>
      </div>
    </div>
  );
}
