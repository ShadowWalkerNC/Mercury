/**
 * AttachmentRenderer — renders a message attachment inline.
 *
 * Images: full inline preview (max 360px wide, click to open full)
 * Other:  file chip with icon, name, size, and download link
 */
import type { CSSProperties } from 'react';

export interface AttachmentMeta {
  key:  string;
  url:  string;
  name: string;
  size: number;
  mime: string;
}

interface Props { attachment: AttachmentMeta; }

export function AttachmentRenderer({ attachment: a }: Props) {
  const isImage = a.mime.startsWith('image/');

  if (isImage) {
    return (
      <a href={a.url} target="_blank" rel="noopener noreferrer" style={css.imgWrap}>
        <img
          src={a.url}
          alt={a.name}
          style={css.img}
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a href={a.url} download={a.name} target="_blank" rel="noopener noreferrer" style={css.fileChip}>
      <span style={css.fileIcon}>&#128196;</span>
      <div style={{ minWidth: 0 }}>
        <div style={css.fileName}>{a.name}</div>
        <div style={css.fileSize}>{(a.size / 1024).toFixed(1)} KB</div>
      </div>
      <span style={css.downloadIcon}>&#11123;</span>
    </a>
  );
}

const css: Record<string, CSSProperties> = {
  imgWrap:      { display: 'inline-block', marginTop: 6, borderRadius: 'var(--radius-md)', overflow: 'hidden', maxWidth: 360, cursor: 'zoom-in' },
  img:          { display: 'block', maxWidth: '100%', maxHeight: 280, objectFit: 'contain', background: 'var(--bg-tertiary)' },
  fileChip:     { display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 6, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', textDecoration: 'none', color: 'var(--text-primary)', maxWidth: 320 },
  fileIcon:     { fontSize: 24, flexShrink: 0 },
  fileName:     { fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileSize:     { fontSize: 11, color: 'var(--text-muted)' },
  downloadIcon: { fontSize: 16, flexShrink: 0, color: 'var(--text-secondary)' },
};
