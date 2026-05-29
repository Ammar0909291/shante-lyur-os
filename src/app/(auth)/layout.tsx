import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthShell } from './_shell';

export const metadata: Metadata = {
  title: 'Sign In — Shante Lyur',
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
