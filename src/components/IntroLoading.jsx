import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { API_BASE } from '../api/client.js';

const TITLE = 'ASEADO';
const SLOGAN = 'Fast, Simple & Secure';

const letterVariants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(10px)', scale: 0.85 },
  show: (i) => ({
    opacity: 1, y: 0, filter: 'blur(0px)', scale: 1,
    transition: { delay: 0.08 * i, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

// Minimum time the animation gets to play before it's allowed to end,
// even if the backend responds instantly (avoids a jarring flash-cut).
const MIN_INTRO_MS = 2200;
// Hard ceiling — if backend genuinely hangs, stop waiting and hand off
// anyway so the user isn't stuck on a splash screen forever.
const MAX_WAIT_MS = 60000;
const POLL_INTERVAL_MS = 500;

export default function IntroLoading({ onDone }) {
  const [phase, setPhase] = useState('intro'); // intro | out
  const calledRef = useRef(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;

    async function pollBackend() {
      const deadline = startRef.current + MAX_WAIT_MS;

      while (!cancelled && Date.now() < deadline) {
        try {
          const r = await fetch(`${API_BASE}/api/bootstrap/status`, { cache: 'no-store' });
          if (r.ok || (r.status >= 400 && r.status < 500)) {
            // Any real HTTP response means Tomcat is up.
            break;
          }
        } catch (_) {
          // backend not reachable yet, keep polling
        }
        await new Promise(res => setTimeout(res, POLL_INTERVAL_MS));
      }

      if (cancelled) return;

      // Respect the minimum runtime so the animation never gets cut off mid-sequence.
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, MIN_INTRO_MS - elapsed);
      await new Promise(res => setTimeout(res, remaining));

      if (cancelled) return;

      setPhase('out');
      setTimeout(() => {
        if (!calledRef.current) {
          calledRef.current = true;
          sessionStorage.setItem('aseado_booted', '1');
          onDone();
        }
      }, 480);
    }

    pollBackend();
    return () => { cancelled = true; };
  }, [onDone]);

  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'var(--bg-base)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', overflow: 'hidden',
      }}
      animate={{ opacity: phase === 'out' ? 0 : 1 }}
      transition={{ duration: 0.48, ease: 'easeInOut' }}
    >
      {/* Ambient glow */}
      <motion.div
        aria-hidden
        style={{
          position: 'absolute', width: 520, height: 520, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--text-secondary) 0%, transparent 70%)',
          opacity: 0.08, filter: 'blur(10px)',
        }}
        animate={{ scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, zIndex: 1 }}
      >
        <div style={{ display: 'flex' }}>
          {TITLE.split('').map((ch, i) => (
            <motion.span
              key={i}
              custom={i}
              variants={letterVariants}
              initial="hidden"
              animate="show"
              style={{
                fontSize: 'clamp(40px, 9vw, 64px)', fontWeight: 900,
                letterSpacing: '.06em', fontFamily: 'var(--mono)',
                color: 'var(--text-primary)', display: 'inline-block',
              }}
            >
              {ch}
            </motion.span>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 * TITLE.length + 0.15, duration: 0.5 }}
          style={{
            fontSize: 13, letterSpacing: '.32em', fontWeight: 700,
            color: 'var(--text-secondary)', textTransform: 'uppercase',
          }}
        >
          {SLOGAN}
        </motion.div>

        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 180, opacity: 1 }}
          transition={{ delay: 0.08 * TITLE.length + 0.35, duration: 0.6, ease: 'easeOut' }}
          style={{ height: 2, background: 'linear-gradient(90deg, transparent, var(--text-primary), transparent)' }}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 * TITLE.length + 0.55, duration: 0.4 }}
          style={{ display: 'flex', gap: 6, marginTop: 4 }}
        >
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
              style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-secondary)' }}
            />
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}