import { useEffect, useRef, useState } from 'react'
import { ImageIcon, X } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'

interface ScreenshotAttachProps {
  value: string | null
  onChange: (base64: string | null) => void
}

export function ScreenshotAttach({ value, onChange }: ScreenshotAttachProps): JSX.Element {
  const [dragging, setDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const readFile = (file: File): void => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      onChange(dataUrl.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  const readBlob = (blob: Blob): void => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      onChange(dataUrl.split(',')[1])
    }
    reader.readAsDataURL(blob)
  }

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent): void => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile()
          if (blob) {
            e.preventDefault()
            readBlob(blob)
            break
          }
        }
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) readFile(file)
  }

  if (value) {
    return (
      <div className="relative inline-block">
        <img
          src={`data:image/png;base64,${value}`}
          alt="Screenshot"
          className="max-h-48 rounded-md border border-border object-contain"
        />
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute -right-2 -top-2 h-6 w-6"
          onClick={() => onChange(null)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex h-24 w-full cursor-default flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border text-sm text-muted-foreground transition-colors',
        dragging && 'border-primary bg-primary/5 text-primary'
      )}
    >
      <ImageIcon className="h-5 w-5" />
      <span>Paste (Ctrl+V) or drag an image here</span>
    </div>
  )
}
