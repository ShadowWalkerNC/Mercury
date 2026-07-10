import { useThemeStore } from '@/stores/themeStore';

export function ThemeToggle({ style }: { style?: React.CSSProperties }) {
  const { theme, toggle } = useThemeStore();
  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        fontSize: 18,
        padding: '4px 10px',
        color: 'var(--text-secondary)',
        lineHeight: 1,
        ...style,
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
