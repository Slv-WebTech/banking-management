import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon.jsx';

export default function NotFound() {
  return (
    <div className="not-found">
      <span className="empty-state-icon">
        <Icon name="search" size={24} />
      </span>
      <div className="not-found-code">404</div>
      <h2>Page not found</h2>
      <p>The page you're looking for doesn't exist or may have been moved.</p>
      <Link to="/" className="btn btn-primary">
        Go home
      </Link>
    </div>
  );
}
