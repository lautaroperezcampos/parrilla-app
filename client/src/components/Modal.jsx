import { useEffect } from 'react'

const SIZES = {
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl'
}

export default function Modal({ title, onClose, children, size = 'md' }) {
  // Cerrar con la tecla Escape.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-carbon/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[95vh] w-full flex-col rounded-t-lg bg-white sm:rounded-lg ${SIZES[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-carbon/10 px-5 py-4">
          <h3 className="text-lg text-carbon">{title}</h3>
          <button onClick={onClose} className="p-1 text-carbon/40 hover:text-carbon" aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
