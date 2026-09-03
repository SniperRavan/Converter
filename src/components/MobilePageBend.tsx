import React, { useRef, useEffect } from 'react'
import { useConverterStore } from '../store/useConverterStore'

interface MobilePageBendProps {
  children: React.ReactNode
}

/**
 * Canvas UI Mobile Whole-Page Virtual Cube Fold
 *
 * Designed to feel natural, stable, and tactile on mobile:
 * - Uses direct DOM ref mutations on scroll (0 React re-renders for maximum performance and 0 RAM churn).
 * - Rock-solid stability in the middle; subtle, responsive kinetic fold only at top and bottom boundaries.
 */
export const MobilePageBend: React.FC<MobilePageBendProps> = ({ children }) => {
  const { motionMode } = useConverterStore()
  const contentRef = useRef<HTMLDivElement>(null)
  const topCreaseRef = useRef<HTMLDivElement>(null)
  const bottomCreaseRef = useRef<HTMLDivElement>(null)
  const resetTimerRef = useRef<number | null>(null)
  const isMobileRef = useRef<boolean>(false)

  useEffect(() => {
    const checkMobile = () => {
      isMobileRef.current = typeof window !== 'undefined' && window.innerWidth < 768
      if (!isMobileRef.current || motionMode === 'off') {
        if (contentRef.current) {
          contentRef.current.style.transform = ''
        }
        if (topCreaseRef.current) topCreaseRef.current.style.opacity = '0'
        if (bottomCreaseRef.current) bottomCreaseRef.current.style.opacity = '0'
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile, { passive: true })

    if (motionMode === 'off') return

    const foldZone = 80
    const maxTipAngle = motionMode === 'reduced' ? 1.5 : 2.8

    const handleScroll = () => {
      if (!isMobileRef.current || !contentRef.current) return

      const currentScrollY = window.scrollY || document.documentElement.scrollTop
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      )

      const isNearTop = currentScrollY < foldZone
      const isNearBottom = maxScroll - currentScrollY < foldZone

      const topEdgeIntensity = Math.min(Math.max(currentScrollY / 120, 0), 1)
      const bottomEdgeIntensity = Math.min(
        Math.max((maxScroll - currentScrollY) / 120, 0),
        1
      )

      if (topCreaseRef.current) {
        topCreaseRef.current.style.opacity = topEdgeIntensity > 0.05 ? `${topEdgeIntensity * 0.4}` : '0'
      }
      if (bottomCreaseRef.current) {
        bottomCreaseRef.current.style.opacity = bottomEdgeIntensity < 0.95 ? `${(1 - bottomEdgeIntensity) * 0.4}` : '0'
      }

      if (isNearTop) {
        contentRef.current.style.transformOrigin = 'top center'
        const progress = (foldZone - currentScrollY) / foldZone
        const angle = Math.min(Math.max(progress * maxTipAngle, 0), maxTipAngle)
        const scale = 1 - angle * 0.003
        contentRef.current.style.transform =
          angle > 0.1
            ? `perspective(1200px) rotateX(${angle.toFixed(2)}deg) scale(${scale.toFixed(4)})`
            : ''
      } else if (isNearBottom) {
        contentRef.current.style.transformOrigin = 'bottom center'
        const progress = (foldZone - (maxScroll - currentScrollY)) / foldZone
        const angle = -Math.min(Math.max(progress * maxTipAngle, 0), maxTipAngle)
        const scale = 1 - Math.abs(angle) * 0.003
        contentRef.current.style.transform =
          Math.abs(angle) > 0.1
            ? `perspective(1200px) rotateX(${angle.toFixed(2)}deg) scale(${scale.toFixed(4)})`
            : ''
      } else {
        contentRef.current.style.transform = ''
      }

      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
      resetTimerRef.current = window.setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.style.transform = ''
        }
      }, 100)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('scroll', handleScroll)
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
    }
  }, [motionMode])

  return (
    <div className="relative w-full overflow-x-hidden">
      {/* Top Virtual Cube Fold Crease */}
      <div
        ref={topCreaseRef}
        aria-hidden="true"
        style={{ opacity: 0 }}
        className="pointer-events-none fixed top-16 left-0 right-0 h-10 bg-gradient-to-b from-neutral-900/20 dark:from-white/10 via-neutral-900/5 to-transparent z-30 transition-opacity duration-200"
      />

      {/* Main Document Content */}
      <div
        ref={contentRef}
        style={{
          transition: 'transform 160ms cubic-bezier(0.25, 1, 0.5, 1)',
        }}
        className="w-full flex flex-col"
      >
        {children}
      </div>

      {/* Bottom Virtual Cube Fold Crease */}
      <div
        ref={bottomCreaseRef}
        aria-hidden="true"
        style={{ opacity: 0 }}
        className="pointer-events-none fixed bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-neutral-900/25 dark:from-white/10 via-neutral-900/5 to-transparent z-30 transition-opacity duration-200"
      />
    </div>
  )
}

export default MobilePageBend
