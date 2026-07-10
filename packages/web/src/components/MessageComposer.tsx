/**
 * MessageComposer — text input + file upload button.
 *
 * M-050 additions:
 *   - Paperclip button opens hidden file input (images + common docs)
 *   - Selected file shows inline preview chip with remove button
 *   - On send: if file attached, fetches presigned URL, PUTs to S3,
 *     then sends message with attachment metadata
 *   - Upload progress bar on the chip
 */
import { useRef, useState, type FormEvent, type ChangeEvent } from 'react';
import { api } from '@/lib/api';

interface Attachment {
  file:     File;
  preview:  string | null;   // object URL for images
  progress: number;          // 0-100
  key?:     string;          // S3 key after upload
  url?:     string;          // public CDN URL
}

interface Props {
  channelName: string;
  onSend: (content: string, attachment?: { key: string; url: string; name: string; size: number; mime: string }) => void;
}

export function MessageComposer({ channelName, onSend }: Props) {
  const [text,       setText]       = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const fileRef                     = useRef<HTMLInputElement>(null);
  const textRef                     = useRef<HTMLTextAreaElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    setAttachment({
      file,
      preview: isImage ? URL.createObjectURL(file) : null,
      progress: 0,
    });
    e.target.value = '';
  }

  function removeAttachment() {
    if (attachment?.preview) URL.revokeObjectURL(attachment.preview);
    setAttachment(null);
  }

  async function uploadFile(att: Attachment): Promise<{ key: string; url: string }> {
    const ext  = att.file.name.split('.').pop() ?? 'bin';
    const mime = att.file.type || 'application/octet-stream';
    const { url, key, public_url } = await api.get<{ url: string; key: string; public_url: string }>(
      `/api/v1/uploads/presign?ext=${ext}&mime=${encodeURIComponent(mime)}`
    );
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', mime);
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          setAttachment(prev => prev ? { ...prev, progress: Math.round(ev.loaded / ev.total * 100) } : prev);
        }
      };
      xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error(`S3 ${xhr.status}`));
      xhr.onerror = () => reject(new Error('Upload network error'));
      xhr.send(att.file);
    });
    return { key, url: public_url };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() && !attachment) return;
    if (uploading) return;
    setUploading(true);
    try {
      let meta: { key: string; url: string; name: string; size: number; mime: string } | undefined;
      if (attachment) {
        const { key, url } = await uploadFile(attachment);
        meta = { key, url, name: attachment.file.name, size: attachment.file.size, mime: attachment.file.type };
        removeAttachment();
      }
      onSend(text.trim(), meta);
      setText('');
      textRef.current?.focus();
    } catch (err) {
      console.error('Send failed', err);
    } finally {
      setUploading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as never);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={css.form}>
      {/* Attachment preview chip */}
      {attachment && (
        <div style={css.chip}>
          {attachment.preview
            ? <img src={attachment.preview} style={css.chipImg} alt="preview" />
            : <span style={css.chipIcon}>&#128196;</span>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={css.chipName}>{attachment.file.name}</div>
            <div style={css.chipSize}>{(attachment.file.size / 1024).toFixed(1)} KB</div>
            {attachment.progress > 0 && attachment.progress < 100 && (
              <div style={css.progressTrack}>
                <div style={{ ...css.progressBar, width: `${attachment.progress}%` }} />
              </div>
            )}
          </div>
          <button type="button" onClick={removeAttachment} style={css.chipRemove} title="Remove">×</button>
        </div>
      )}

      <div style={css.row}>
        {/* File button */}
        <button type="button" onClick={() => fileRef.current?.click()} style={css.iconBtn} title="Attach file" disabled={uploading}>
          &#128206;
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,.txt,.md,.csv,.json,.zip"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Text area */}
        <textarea
          ref={textRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName}`}
          rows={1}
          style={css.input}
          disabled={uploading}
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={uploading || (!text.trim() && !attachment)}
          style={{
            ...css.sendBtn,
            opacity: uploading || (!text.trim() && !attachment) ? 0.45 : 1,
          }}
        >
          {uploading ? '⏳' : '➤'}
        </button>
      </div>
    </form>
  );
}

const css: Record<string, React.CSSProperties> = {
  form:         { padding: '8px 16px 12px', flexShrink: 0, borderTop: '1px solid var(--border)' },
  row:          { display: 'flex', alignItems: 'flex-end', gap: 8 },
  iconBtn:      { fontSize: 18, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '6px 4px', flexShrink: 0, lineHeight: 1 },
  input:        { flex: 1, resize: 'none', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 14, padding: '8px 12px', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 160, overflowY: 'auto' },
  sendBtn:      { fontSize: 18, background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', cursor: 'pointer', padding: '7px 10px', flexShrink: 0, lineHeight: 1, transition: 'opacity 0.15s' },
  chip:         { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '6px 10px', marginBottom: 6 },
  chipImg:      { width: 40, height: 40, objectFit: 'cover', borderRadius: 4, flexShrink: 0 },
  chipIcon:     { fontSize: 28, flexShrink: 0 },
  chipName:     { fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  chipSize:     { fontSize: 11, color: 'var(--text-muted)' },
  chipRemove:   { fontSize: 18, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 4px', flexShrink: 0, lineHeight: 1 },
  progressTrack:{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  progressBar:  { height: '100%', background: 'var(--accent)', borderRadius: 2, transition: 'width 0.1s' },
};
