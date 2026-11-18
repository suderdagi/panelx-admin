import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  side?: boolean
}

/**
 * Built on the native <dialog> element: focus trapping, Escape to close and the
 * backdrop come from the browser, so the modal is accessible without extra libraries.
 */
export function Modal({ open, title, onClose, children, footer, side = false }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId() // a fixed id would repeat when two dialogs are on the page

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal?.()
    if (!open && dialog.open) dialog.close?.()
  }, [open])

  return (
    <dialog
      ref={ref}
      open={typeof HTMLDialogElement === 'undefined' ? open : undefined}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby={titleId}
      className={
        side
          ? 'm-0 ml-auto h-full max-h-full w-full max-w-md bg-white p-0 text-inherit backdrop:bg-slate-900/40 dark:bg-slate-900'
          : 'm-auto w-full max-w-lg rounded-xl bg-white p-0 text-inherit shadow-xl backdrop:bg-slate-900/40 dark:bg-slate-900'
      }
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 id={titleId} className="text-base font-semibold">
              {title}
            </h2>
            <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}
