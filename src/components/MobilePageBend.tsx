import React, { useState, useRef, useEffect } from 'react'
import { useConverterStore } from '../store/useConverterStore'

interface MobilePageBendProps {
  children: React.ReactNode
}

/**
 * Canvas UI Mobile Whole-Page Bend Component
 *
 * In mobile view (< 768px):
 * Folds the entire page dynamically over virtual cube edges as the user scrolls,
 * providing kinetic 3D perspective tilt and subtle crease illumination.
 *
 * In desktop view (>= 768px):
 * Renders cleanly with zero 3D transforms (flat, standard desktop scrolling).
 */
export const MobilePageBend: React.FC<MobilePageBendProps> = ({ children }) => {
  const { motionMode } = useConverterStore()
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [bendTransform, setBendTransform] = useState<string>('')
  const [topCreaseIntensity, setTopCreaseIntensity] = useState<number>(0)
  const [bottomCreaseIntensity, setBottomCreaseIntensity] = useState<number>(0)

  const lastScrollYRef = useRef(0)
  const scrollTimeoutRef = useRef<number | null>(null)

  // Track screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Window scroll listener for mobile page bend
  useEffect(() => {
    if (!isMobile || motionMode === 'off') {
      setBendTransform('')
      setTopCreaseIntensity(0)
      setBottomCreaseIntensity(0)
      return
    }

    const maxAngle = 9 // gentle perspective angle for full page
    const zone = 160 // fold zone height in px

    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight
      const delta = currentScrollY - lastScrollYRef.current
      lastScrollYRef.current = currentScrollY

      // Velocity tilt
      const velocityAngle = Math.min(Math.max(delta * 0.25, -maxAngle), maxAngle)

      // Edge fold calculations
      let topFold = 0
      let bottomFold = 0

      if (currentScrollY < zone) {
        topFold = ((zone - currentScrollY) / zone) * 3
      }
      if (maxScroll - currentScrollY < zone && maxScroll > 0) {
        bottomFold = ((zone - (maxScroll - currentScrollY)) / zone) * 3
      }

      const netAngle = velocityAngle + topFold - bottomFold
      const scale = 1 - Math.min(Math.abs(netAngle) * 0.002, 0.02)
      const translateZ = -Math.abs(netAngle) * 1.5

      setBendTransform(
        `perspective(1000px) rotateX(${netAngle.toFixed(2)}deg) scale(${scale.toFixed(3)}) translateZ(${translateZ.toFixed(1)}px)`
      )

      setTopCreaseIntensity(Math.min(Math.max((velocityAngle + topFold) / maxAngle, 0), 0.35))
      setBottomCreaseIntensity(Math.min(Math.max((-velocityAngle + bottomFold) / maxAngle, 0), 0.35))

      // Smooth settling back to resting state
      if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = window.setTimeout(() => {
        setBendTransform('perspective(1000px) rotateX(0deg) scale(1) translateZ(0px)')
        setTopCreaseIntensity(0)
        setBottomCreaseIntensity(0)
      }, 160)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current)
    }
  }, [isMobile, motionMode])

  return (
    <div className="relative w-full overflow-hidden">
      {/* Dynamic Top Edge Fold Crease on Mobile */}
      {isMobile && topCreaseIntensity > 0.02 && (
        <div
          aria-hidden="true"
          style={{ opacity: topCreaseIntensity }}
          className="pointer-events-none fixed top-0 left-0 right-0 h-14 bg-gradient-to-b from-black/25 dark:from-white/10 to-transparent z-40 transition-opacity duration-150"
        />
      )}

      {/* Main Page Content */}
      <div
        style={{
          transform: isMobile && motionMode !== 'off' ? bendTransform : undefined,
          transformOrigin: '50% 50%',
          transition: isMobile ? 'transform 120ms cubic-bezier(0.2, 0.8, 0.4, 1)' : undefined,
          willChange: isMobile ? 'transform' : undefined,
        }}
        className="w-full flex flex-col"
      >
        {children}
      </div>

      {/* Dynamic Bottom Edge Fold Crease on Mobile */}
      {isMobile && bottomCreaseIntensity > 0.02 && (
        <div
          aria-hidden="true"
          style={{ opacity: bottomCreaseIntensity }}
          className="pointer-events-none fixed bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-black/25 dark:from-white/10 to-transparent z-40 transition-opacity duration-150"
        />
      )}
    </div>
  )
}

export default MobilePageBend
