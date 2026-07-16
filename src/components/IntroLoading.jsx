import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { API_BASE } from '../api/client.js';

const TITLE = 'ASEADO';
const SLOGAN = 'Fast, Simple & Secure';

// Research on this stuff is pretty consistent (Slack, Spotify, Skype,
// Airbnb): one clean, well-sprung motion, under ~2 seconds, then get out
// of the way. The "fun" comes from the bounce being nicely tuned, not
// from a multi-act story. So: logo pops in with a spring + one quick
// shine, wordmark follows, done.
const MIN_INTRO_MS = 1300;
// Hard ceiling — if the backend genuinely hangs, stop waiting and hand
// off anyway so the user isn't stuck on a splash screen forever.
const MAX_WAIT_MS = 60000;
const POLL_INTERVAL_MS = 500;

const letterVariants = {
  hidden: { opacity: 0, y: 10 },
  show: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.55 + 0.04 * i, duration: 0.35, ease: 'easeOut' },
  }),
};

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

      // Respect a small minimum so the logo's own animation never gets cut
      // off mid-spring — not an artificial "watch my animation" delay.
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
      }, 400);
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
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      {/* Ambient glow — a slow, quiet pulse behind everything (same idea as
          Spotify's green pulse: calm, continuous, not attention-grabbing) */}
      <motion.div
        aria-hidden
        style={{
          position: 'absolute', width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--board-amber) 0%, transparent 70%)',
          opacity: 0.06, filter: 'blur(10px)',
        }}
        animate={{ scale: [0.92, 1.04, 0.92] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, zIndex: 1 }}>
        {/* Logo — one confident spring-in, no ring, no sweep-and-scrub story.
            A single shine glints across it right as it lands. */}
        <div style={{ position: 'relative', width: 84, height: 84, overflow: 'hidden', borderRadius: '50%' }}>
          <motion.img
            src="/logo.png"
            alt="ASEADO"
            initial={{ opacity: 0, scale: 0.55 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 16 }}
            style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative' }}
          />
          <motion.div
            aria-hidden
            initial={{ x: '-130%', opacity: 0 }}
            animate={{ x: '130%', opacity: [0, 0.55, 0] }}
            transition={{ duration: 0.55, delay: 0.32, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: 0, bottom: 0, width: '45%',
              background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.6), transparent)',
              mixBlendMode: 'overlay', pointerEvents: 'none',
            }}
          />
        </div>

        {/* Wordmark — clean fade + rise, no per-letter flip theatrics */}
        <div style={{ display: 'flex', gap: 6 }}>
          {TITLE.split('').map((ch, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={letterVariants}
              initial="hidden"
              animate="show"
              className="flap"
              style={{
                fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 800,
                fontFamily: 'var(--mono)', width: 'clamp(26px, 5.4vw, 38px)',
                height: 'clamp(36px, 7.2vw, 50px)',
              }}
            >
              {ch}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.95 }}
          style={{
            fontSize: 11, letterSpacing: '.28em', fontWeight: 700,
            color: 'var(--text-secondary)', textTransform: 'uppercase',
          }}
        >
          {SLOGAN}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.05 }}
          style={{ display: 'flex', gap: 6, marginTop: 2 }}
        >
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
              style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--board-amber)' }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
