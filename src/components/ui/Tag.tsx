interface TagProps {
  label: string
  isNew?: boolean
  onRemove?: () => void
}

export function Tag({ label, isNew = false, onRemove }: TagProps) {
  return (
    <span
      className={isNew ? 'tag-new' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 4,
        fontSize: 10,
        letterSpacing: '0.04em',
        background: 'var(--cream-2)',
        color: 'var(--ink-soft)',
        border: '1px solid var(--line-soft)',
        fontFamily: 'var(--mono)',
      }}
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', lineHeight: 1 }}
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      )}
    </span>
  )
}
