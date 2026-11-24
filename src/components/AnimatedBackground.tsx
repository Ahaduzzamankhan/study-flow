import { motion } from 'framer-motion'
import { useSettings } from '@/stores/appStore'

const STARS = [
  { left: '8%', top: '12%', size: 16, delay: 0 },
  { left: '22%', top: '72%', size: 10, delay: 1.2 },
  { left: '44%', top: '18%', size: 8, delay: 0.6 },
  { left: '68%', top: '64%', size: 14, delay: 1.8 },
  { left: '86%', top: '22%', size: 9, delay: 0.9 },
  { left: '92%', top: '80%', size: 12, delay: 2.1 },
]

export function AnimatedBackground() {
  const settings = useSettings()
  const animate = settings.animatedBackground && !settings.reducedMotion

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[var(--background)]" />
      <div className="pastel-grid absolute inset-0 opacity-70" />
      <motion.div
        className="absolute -left-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-[color-mix(in_srgb,var(--primary)_22%,transparent)] blur-3xl"
        animate={animate ? { scale: [1, 1.08, 1], opacity: [0.55, 0.8, 0.55] } : undefined}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-24 top-24 h-[22rem] w-[22rem] rounded-full bg-[color-mix(in_srgb,var(--secondary)_35%,transparent)] blur-3xl"
        animate={animate ? { y: [0, 26, 0], opacity: [0.5, 0.75, 0.5] } : undefined}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-6rem] left-1/3 h-[24rem] w-[24rem] rounded-full bg-[color-mix(in_srgb,var(--accent)_32%,transparent)] blur-3xl"
        animate={animate ? { x: [0, -30, 0], opacity: [0.45, 0.7, 0.45] } : undefined}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      {STARS.map((star, index) => (
        <motion.svg
          key={index}
          viewBox="0 0 24 24"
          width={star.size}
          height={star.size}
          style={{ position: 'absolute', left: star.left, top: star.top, color: 'var(--ring)' }}
          animate={animate ? { opacity: [0.25, 0.9, 0.25], scale: [0.85, 1.15, 0.85], rotate: [0, 20, 0] } : undefined}
          transition={{ duration: 6, delay: star.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path
            fill="currentColor"
            d="M12 1.8c1 4.6 2.8 6.4 7.4 7.4-4.6 1-6.4 2.8-7.4 7.4-1-4.6-2.8-6.4-7.4-7.4 4.6-1 6.4-2.8 7.4-7.4z"
          />
        </motion.svg>
      ))}
      <svg className="absolute bottom-10 left-0 h-20 w-full opacity-[0.12]" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path
          fill="var(--primary)"
          d="M0 80c120-40 240-60 360-40s240 80 360 70 240-70 360-70 120 20 120 20v60H0z"
        />
      </svg>
    </div>
  )
}
