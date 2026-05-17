import type { Person } from '../types';
import { usePhotoUrl } from '../utils/image';

interface Props {
  person: Person;
  size?: number;
}

function initials(p: Person) {
  const g = p.givenName?.[0] ?? '';
  const s = p.surname?.[0] ?? '';
  return (g + s).toUpperCase() || '?';
}

function bgForSex(p: Person) {
  return p.sex === 'M' ? '#cfe2ff' : p.sex === 'F' ? '#ffd3e1' : '#e9e9ed';
}

export function Avatar({ person, size = 36 }: Props) {
  const url = usePhotoUrl(person.photo);
  const style = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.4),
    background: url ? 'transparent' : bgForSex(person),
  };
  return (
    <span className="avatar" style={style} aria-hidden="true">
      {url ? <img src={url} alt="" /> : <span>{initials(person)}</span>}
    </span>
  );
}
