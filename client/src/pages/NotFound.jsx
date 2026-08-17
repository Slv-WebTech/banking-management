import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <h2>404 - Page not found</h2>
      <Link to="/">Go home</Link>
    </div>
  );
}
