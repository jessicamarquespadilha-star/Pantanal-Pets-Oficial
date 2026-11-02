export default function Icon({ name, className = '', title }) {
  return (
    <i
      className={`fa-solid ${name} ${className}`.trim()}
      aria-hidden={title ? undefined : 'true'}
      title={title}
    />
  );
}
