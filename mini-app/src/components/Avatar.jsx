export default function Avatar({ name = '', photo, color = '#2563eb', size = 44 }) {
  const initials = name
    .replace(/^dr\.?\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  if (photo) {
    return <img className="avatar" src={photo} alt={name} style={{ width: size, height: size }} />;
  }

  return (
    <div
      className="avatar"
      style={{ width: size, height: size, background: `${color}1f`, color, fontSize: Math.round(size * 0.36) }}
    >
      {initials || '🙂'}
    </div>
  );
}
