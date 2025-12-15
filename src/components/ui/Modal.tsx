import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

import { cn } from '@/lib/cn';

export function ModalRoot(props: Dialog.DialogProps) {
  return <Dialog.Root {...props} />;
}

export const ModalTrigger = Dialog.Trigger;
export const ModalClose = Dialog.Close;

export function ModalContent({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 bg-slate-900/40" />
      <Dialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-5 shadow-xl',
          'focus:outline-none',
        )}
      >
        <Dialog.Title className="text-base font-semibold text-text">{title}</Dialog.Title>
        {description ? (
          <Dialog.Description className="mt-1 text-sm text-text-muted">
            {description}
          </Dialog.Description>
        ) : null}
        <div className="mt-4">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
