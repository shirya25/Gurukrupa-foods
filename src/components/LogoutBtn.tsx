'use client';
import { logout } from '@/lib/auth/actions';

export default function LogoutBtn({ className = 'nav-btn' }: { className?: string }) {
  return (
    <button className={className} onClick={() => logout()}>
      🚪 Logout
    </button>
  );
}
