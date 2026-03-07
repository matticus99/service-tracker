import { useState, useRef } from 'react'
import { X } from 'lucide-react'

interface Props {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({
  tags,
  onChange,
  placeholder = 'Add service...',
}: Props) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag() {
    const val = input.trim()
    if (val && !tags.includes(val)) {
      onChange([...tags, val])
    }
    setInput('')
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index))
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex flex-wrap gap-1.5 px-3 py-2 bg-bg-input border border-border-default rounded-lg min-h-[42px] cursor-text focus-within:border-accent transition-colors"
    >
      {tags.map((tag, i) => (
        <span
          key={i}
          className="flex items-center gap-1 bg-bg-elevated text-text-primary rounded-full px-2.5 py-0.5 text-sm"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeTag(i)
            }}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
            e.preventDefault()
            addTag()
          } else if (e.key === 'Backspace' && !input && tags.length > 0) {
            removeTag(tags.length - 1)
          }
        }}
        onBlur={() => {
          if (input.trim()) addTag()
        }}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent text-text-primary text-sm outline-none"
      />
    </div>
  )
}
