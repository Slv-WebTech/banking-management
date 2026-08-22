import Icon from './Icon.jsx';

export default function Spinner({ size = 16, className = '' }) {
  return <Icon name="spinner" size={size} className={`btn-spinner ${className}`.trim()} />;
}
