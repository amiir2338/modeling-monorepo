// ELI5:
// این قلاب نقش کاربر را از روی وجود توکن تشخیص می‌دهد.
// بعداً می‌توانید توکن را decode کنید که role دقیق بدهد.
import { useEffect, useState } from 'react';

export function useAuthGate() {
  const [isGuest, setGuest] = useState(true);

  useEffect(() => {
    const tok = localStorage.getItem('access_token');
    setGuest(!tok);
  }, []);

  return { isGuest };
}
