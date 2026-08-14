'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutBtn from '@/components/LogoutBtn';

const tabs = [
  { href: '/owner/customers', label: '👥 Users' },
  { href: '/owner/bills',     label: '💰 Bills' },
  { href: '/owner/menu-management', label: '📋 Menu' },
];

export default function OwnerNav() {
  const path = usePathname();
  return (
    <nav>
      {tabs.map(t => (
        <Link key={t.href} href={t.href}
          className={`nav-btn${path.startsWith(t.href) ? ' active' : ''}`}>
          {t.label}
        </Link>
      ))}
      <LogoutBtn />
    </nav>
  );
}
