'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="app-nav">
      <div className="app-nav-inner">
        <Link href="/" className="app-nav-brand">
          🚗 Mileage Tracker
        </Link>
        <div className="app-nav-links">
          <Link
            href="/"
            className={`app-nav-link${pathname === '/' ? ' app-nav-link--active' : ''}`}
          >
            Tracker
          </Link>
          <Link
            href="/database"
            className={`app-nav-link${pathname === '/database' ? ' app-nav-link--active' : ''}`}
          >
            Database
          </Link>
        </div>
      </div>
    </nav>
  );
}
