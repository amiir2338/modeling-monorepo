'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function AppHeader() {
  const { user, signOut } = useAuth();

  return (
    <header className="w-full bg-white/80 backdrop-blur sticky top-0 z-10 border-b">
      <div className="max-w-5xl mx-auto flex items-center justify-between p-3">
        <Link href="/" className="font-extrabold text-[#7D6CB2]">
          Modeling
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/jobs" className="hover:underline">
                Jobs
              </Link>
              <Link href="/inbox" className="hover:underline">
                Inbox
              </Link>
              <Link href="/notifications" className="hover:underline">
                Notifications
              </Link>
              <Link href="/profile" className="hover:underline">
                Profile
              </Link>
              <button
                onClick={signOut}
                className="rounded-md px-3 py-1.5 bg-[#7D6CB2] text-white"
              >
                خروج
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-md px-3 py-1.5 bg-[#7D6CB2] text-white"
            >
              ورود
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

