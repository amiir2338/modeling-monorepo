declare module "next/navigation" {
  export function useRouter(): {
    push: (href: string) => void;
    replace: (href: string) => void;
    back: () => void;
    refresh: () => void;
    prefetch?: (href: string) => Promise<void>;
  };
  export function useParams<T extends Record<string, string> = Record<string, string>>(): T;
  export function useSearchParams(): URLSearchParams;
}
