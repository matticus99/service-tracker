import { useRef } from 'react'
import { Paperclip, Upload, X, FileText } from 'lucide-react'
import {
  useAttachments,
  useUploadAttachment,
  useDeleteAttachment,
} from '@/hooks/useApi'
import { useToast } from '@/context/ToastContext'
import { api } from '@/lib/api'

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
])
const MAX_SIZE = 10 * 1024 * 1024

interface Props {
  vehicleId: string
  recordType: 'oil_change' | 'service_record' | 'observation'
  recordId: string
}

export function AttachmentSection({ vehicleId, recordType, recordId }: Props) {
  const { data: attachments, isLoading } = useAttachments(
    vehicleId,
    recordType,
    recordId,
  )
  const uploadMutation = useUploadAttachment()
  const deleteMutation = useDeleteAttachment()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES.has(file.type)) {
      toast('File type not supported', 'error')
      return
    }
    if (file.size > MAX_SIZE) {
      toast('File exceeds 10 MB limit', 'error')
      return
    }
    const formData = new FormData()
    formData.append('vehicle_id', vehicleId)
    formData.append('record_type', recordType)
    formData.append('record_id', recordId)
    formData.append('file', file)

    uploadMutation.mutate(formData, {
      onSuccess: () => toast('File uploaded'),
      onError: () => toast('Upload failed', 'error'),
    })
    e.target.value = ''
  }

  function handleDelete(id: string, filename: string) {
    if (!confirm(`Delete ${filename}?`)) return
    deleteMutation.mutate(id, {
      onSuccess: () => toast('File deleted'),
      onError: () => toast('Delete failed', 'error'),
    })
  }

  const isImage = (mime: string) => mime.startsWith('image/')

  return (
    <div className="mt-4 pt-4 border-t border-border-subtle">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" />
          Attachments
        </span>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {isLoading ? (
        <div className="text-xs text-text-muted">Loading...</div>
      ) : !attachments || attachments.length === 0 ? (
        <div className="text-xs text-text-muted">No attachments</div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {attachments.map((att) => (
            <div key={att.id} className="relative group">
              {isImage(att.mime_type) ? (
                <a
                  href={api.attachments.getUrl(att.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={api.attachments.getUrl(att.id)}
                    alt={att.filename}
                    className="w-full h-20 object-cover rounded-lg border border-border-subtle"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </a>
              ) : (
                <a
                  href={api.attachments.getUrl(att.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full h-20 bg-bg-elevated rounded-lg border border-border-subtle"
                >
                  <FileText className="w-8 h-8 text-text-muted" />
                </a>
              )}
              <button
                onClick={() => handleDelete(att.id, att.filename)}
                className="absolute top-1 right-1 p-0.5 bg-bg-body/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-status-overdue"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <p className="text-[10px] text-text-muted truncate mt-1">
                {att.filename}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
