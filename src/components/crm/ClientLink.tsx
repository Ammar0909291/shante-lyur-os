'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ClientProfileSheet } from './ClientProfileSheet';

interface ClientLinkProps {
  id: string;
  name: string;
  className?: string;
}

/**
 * Renders the client's name as a clickable link.
 * On click, opens a slide-over panel with the client summary.
 * Navigating to the full profile page is available inside the panel.
 */
export function ClientLink({ id, name, className }: ClientLinkProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'text-left underline-offset-2 hover:underline text-champagne hover:text-champagne/80 transition-colors',
          className,
        )}
      >
        {name}
      </button>

      <ClientProfileSheet
        clientId={id}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
