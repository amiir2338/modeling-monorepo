'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';

export default function Guard({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: UserRole[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  if (loading) return <div className="p-6 text-center">در حال بارگذاری…</div>;
  if (!user) return null;
  if (roles && !roles.includes(user.role)) {
    return <div className="p-6 text-center">اجازه دسترسی ندارید.</div>;
  }
  return <>{children}</>;
}

