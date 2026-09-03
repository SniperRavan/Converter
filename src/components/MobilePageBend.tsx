import React, { useState, useRef, useEffect } from 'react'
import { useConverterStore } from '../store/useConverterStore'

interface MobilePageBendProps {
  children: React.ReactNode
}

/**
 * Canvas UI Mobile Whole-Page Virtual Cube Fold
 *
 * Designed to feel natural, stable, and tactile on mobile:
 * - The main reading body stays 100% stable during normal scrolling (no jarring see-saw wobble).
 * - The top and bottom viewport borders act as virtual cube edges with dynamic crease depth.
 * - At the boundaries (top and bottom of page), gentle organic rubber-band fold physics
 *   pivot from the respective edge ('top center' or 'bottom center') rather than wobbling the center.
 */
export const MobilePageBend: React.FC<MobilePageBendProps> = ({ children }) => {
  const { motionMode } = useConverterStore()
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [bendTransform, setBendTransform] = useState<string>('')
  const [transformOrigin, setTransformOrigin] = useState<string>('top center')
  const [topCreaseOpacity, setTopCreaseOpacity] = useState<number>(0)
  const [bottomCreaseOpacity, setBottomCreaseOpacity] = useState<number>(0)

  const lastScrollYRef = useRef(0)
  const isSettlingRef = useRef<boolean>(false)
  const resetTimerRef = useRef<number | null>(null)

  // Detect mobile viewport (< 768px)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile, { passive: true })
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Mobile scroll physics listener
  useEffect(() => {
    if (!isMobile || motionMode === 'off') {
      setBendTransform('')
      setTopCreaseOpacity(0)
      setBottomCreaseOpacity(0)
      return
    }

    const foldZone = 80 // height of virtual edge zone in px
    const maxTipAngle = motionMode === 'reduced' ? 1.5 : 2.8 // subtle, stable tip angle

    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      )

      // Calculate proximity to edges
      const isNearTop = currentScrollY < foldZone
      const isNearBottom = maxScroll - currentScrollY < foldZone

      // Dynamic crease illumination as content passes virtual cube edges
      const topEdgeIntensity = Math.min(Math.max(currentScrollY / 120, 0), 1)
      const bottomEdgeIntensity = Math.min(
        Math.max((maxScroll - currentScrollY) / 120, 0),
        1
      )

      setTopCreaseOpacity(topEdgeIntensity > 0.05 ? topEdgeIntensity * 0.4 : 0)
      setBottomCreaseOpacity(bottomEdgeIntensity < 0.95 ? (1 - bottomEdgeIntensity) * 0.4 : 0)

      // Only apply 3D fold rotation at the boundaries (top/bottom) so normal scrolling is rock solid
      if (isNearTop) {
        setTransformOrigin('top center')
        const progress = (foldZone - currentScrollY) / foldZone
        const angle = Math.min(Math.max(progress * maxTipAngle, 0), maxTipAngle)
        const scale = 1 - angle * 0.003
        setBendTransform(
          angle > 0.1
            ? `perspective(1200px) rotateX(${angle.toFixed(2)}deg) scale(${scale.toFixed(4)})`
            : ''
        )
      } else if (isNearBottom) {
        setTransformOrigin('bottom center')
        const progress = (foldZone - (maxScroll - currentScrollY)) / foldZone
        const angle = -Math.min(Math.max(progress * maxTipAngle, 0), maxTipAngle)
        const scale = 1 - Math.abs(angle) * 0.003
        setBendTransform(
          Math.abs(angle) > 0.1
            ? `perspective(1200px) rotateX(${angle.toFixed(2)}deg) scale(${scale.toFixed(4)})`
            : ''
        )
      } else {
        // In the middle of the document: perfectly flat and stable
        if (bendTransform) {
          setBendTransform('')
        }
      }

      lastScrollYRef.current = currentScrollY

      // Return to resting position when scrolling stops
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
      resetTimerRef.current = window.setTimeout(() => {
        if (!isSettlingRef.current) {
          setBendTransform('')
        }
      }, 100)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
    }
  }, [isMobile, motionMode, bendTransform])

  return (
    <div className="relative w-full overflow-x-hidden">
      {/* Top Virtual Cube Fold Crease (Mobile Only) */}
      {isMobile && motionMode !== 'off' && (
        <div
          aria-hidden="true"
          style={{ opacity: topCreaseOpacity }}
          className="pointer-events-none fixed top-16 left-0 right-0 h-10 bg-gradient-to-b from-neutral-900/20 dark:from-white/10 via-neutral-900/5 to-transparent z-30 transition-opacity duration-200"
        />
      )}

      {/* Main Document Content */}
      <div
        style={{
          transform: isMobile && motionMode !== 'off' ? bendTransform || undefined : undefined,
          transformOrigin,
          transition: isMobile ? 'transform 160ms cubic-bezier(0.25, 1, 0.5, 1)' : undefined,
          willChange: isMobile ? 'transform' : undefined,
        }}
        className="w-full flex flex-col"
      >
        {children}
      </div>

      {/* Bottom Virtual Cube Fold Crease (Mobile Only) */}
      {isMobile && motionMode !== 'off' && (
        <div
          aria-hidden="true"
          style={{ opacity: bottomCreaseOpacity }}
          className="pointer-events-none fixed bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-neutral-900/25 dark:from-white/10 via-neutral-900/5 to-transparent z-30 transition-opacity duration-200"
        />
      )}
    </div>
  )
}

export default MobilePageBend
