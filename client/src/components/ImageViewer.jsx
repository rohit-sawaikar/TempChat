import { X } from 'lucide-react'

function ImageViewer({ src, onClose, onBlockContextMenu }) {
  return (
    <div
      className="
        fixed inset-0 z-[100]
        flex items-center justify-center p-4
        image-viewer-enter
      "
      style={{
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
    >
      <button
        className="absolute right-5 top-5 flex items-center justify-center rounded-full p-2.5 transition-colors"
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#94a3b8',
        }}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        <X size={20} />
      </button>

      <img
        src={src}
        alt="enlarged"
        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
        style={{
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={onBlockContextMenu}
      />
    </div>
  )
}

export default ImageViewer