import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  required?: boolean
  icon?: ReactNode
  children: ReactNode
}

export function FormField({ label, required, icon, children }: FormFieldProps) {
  return (
    <div>
      <label className="text-sm text-text-secondary block mb-1">
        {icon && <span className="inline mr-1 align-text-bottom">{icon}</span>}
        {label}
        {required && <span className="text-status-overdue ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export const inputClass =
  'w-full px-3 py-2.5 bg-bg-input border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent transition-colors'

export const textareaClass =
  'w-full px-3 py-2.5 bg-bg-input border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent transition-colors resize-none'
