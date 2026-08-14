'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutBtn from './LogoutBtn';

const tabs = [
  { href: '/menu',    label: '🍽 Menu' },
  { href: '/history', label: '📋 History' },
  { href: '/paybill', label: '💳 Pay Bill' },
  { href: '/profile', label: '👤 Profile' },
];

export default function NavBar() {
  const path = usePathname();
  return (
    <nav>
      {tabs.map(t => (
        <Link key={t.href} href={t.href} className={`nav-btn${path === t.href ? ' active' : ''}`}>
          {t.label}
        </Link>
      ))}
      <LogoutBtn />
    </nav>
  );
}
