import { motion } from 'framer-motion';

// Small icon toggle — sun/moon crossfade. Used on Login, Licence, and Menu.
export function ThemeToggle({ theme, onToggle, style }) {
  const isLight = theme === 'light';
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.88 }}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-label="Toggle theme"
      style={{
        width: 34, height: 34, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg-subtle)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        ...style,
      }}
    >
      <motion.span
        key={isLight ? 'sun' : 'moon'}
        initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{ display: 'flex', fontSize: 15, lineHeight: 1 }}
      >
        {isLight ? '☀' : '☾'}
      </motion.span>
    </motion.button>
  );
}
