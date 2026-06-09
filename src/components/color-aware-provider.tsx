import { type ReactNode } from 'react';
import { useColorAware } from '@/hooks/use-color-aware';

export function ColorAwareProvider({ children }: { children: ReactNode }) {
  useColorAware();
  return <>{children}</>;
}
