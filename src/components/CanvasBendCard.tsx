import React, { useState, useRef, useEffect } from 'react'
import { useConverterStore } from '../store/useConverterStore'

interface CanvasBendCardProps {
  children: React.ReactNode
  className?: string
  /** Height of the folded zone in px */
  zone?: number
  /** Max angle of the bend in degrees */
  maxAngle?: number
}

// Canvas UI Bend Card with kinetic 3D scroll bend and edge fold motion
// Zero hover tilt on pointer move; dynamic physics only occur during active scrolling or mobile touch
export const CanvasBendCard: React.FC<CanvasBendCardProps> = ({
  children,
  className = '',
  zone = 120,
  maxAngle = 14,
}) => {
  const { motionMode } = useConverterStore()
  const cardRef = useRef<HTMLDivElement>(null)
  const [bendTransform, setBendTransform] = useState<string>('')
  const [topCreaseIntensity, setTopCreaseIntensity] = useState<number>(0)
  const [bottomCreaseIntensity, setBottomCreaseIntensity] = useState<number>(0)

  const lastScrollYRef = useRef(0)
  const scrollTimeoutRef = useRef<number | null>(null)

  // Scroll listener attached to parent scrollable container
  useEffect(() => {
    if (motionMode === 'off') return

    const card = cardRef.current
    if (!card) return

    // Find nearest scrollable ancestor
    let scrollParent: HTMLElement | null = card.parentElement
    while (scrollParent) {
      const overflowY = window.getComputedStyle(scrollParent).overflowY
      if (overflowY === 'auto' || overflowY === 'scroll') break
      scrollParent = scrollParent.parentElement
    }

    if (!scrollParent) return

    const handleScroll = () => {
      const currentScrollY = scrollParent!.scrollTop
      const maxScroll = scrollParent!.scrollHeight - scrollParent!.clientHeight
      const delta = currentScrollY - lastScrollYRef.current
      lastScrollYRef.current = currentScrollY

      // Velocity-based dynamic bend
      const velocityAngle = Math.min(Math.max(delta * 0.35, -maxAngle), maxAngle)

      // Edge fold calculations: as content approaches ends, folds increase
      let topFold = 0
      let bottomFold = 0

      if (currentScrollY < zone) {
        topFold = ((zone - currentScrollY) / zone) * 4
      }
      if (maxScroll - currentScrollY < zone && maxScroll > 0) {
        bottomFold = ((zone - (maxScroll - currentScrollY)) / zone) * 4
      }

      const netAngle = velocityAngle + topFold - bottomFold
      const scale = 1 - Math.min(Math.abs(netAngle) * 0.003, 0.04)
      const translateZ = -Math.abs(netAngle) * 2.2

      setBendTransform(
        `perspective(900px) rotateX(${netAngle.toFixed(2)}deg) scale(${scale.toFixed(3)}) translateZ(${translateZ.toFixed(1)}px)`
      )

      // Dynamic light crease shading along the folded edges
      setTopCreaseIntensity(Math.min(Math.max((velocityAngle + topFold) / maxAngle, 0), 0.45))
      setBottomCreaseIntensity(Math.min(Math.max((-velocityAngle + bottomFold) / maxAngle, 0), 0.45))

      // Smooth settling back to resting state when scrolling stops
      if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = window.setTimeout(() => {
        setBendTransform('perspective(900px) rotateX(0deg) scale(1) translateZ(0px)')
        setTopCreaseIntensity(0)
        setBottomCreaseIntensity(0)
      }, 160)
    }

    scrollParent.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      scrollParent?.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current)
    }
  }, [motionMode, zone, maxAngle])

  // Mobile Touch Movement: Natural kinetic tipping on drag
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (motionMode === 'off') return
    const touch = e.touches[0]
    const card = cardRef.current
    if (!touch || !card) return
    const rect = card.getBoundingClientRect()
    const y = touch.clientY - rect.top
    const centerY = rect.height / 2
    const tilt = ((y - centerY) / centerY) * -4.5

    setBendTransform(`perspective(800px) rotateX(${tilt.toFixed(2)}deg) scale(0.99) translateZ(-4px)`)
  }

  const handleTouchEnd = () => {
    setBendTransform('perspective(800px) rotateX(0deg) scale(1) translateZ(0px)')
    setTopCreaseIntensity(0)
    setBottomCreaseIntensity(0)
  }

  // If motion is off, return clean static container
  if (motionMode === 'off') {
    return <div className={`relative ${className}`}>{children}</div>
  }

  return (
    <div
      ref={cardRef}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: bendTransform || undefined,
        transformOrigin: 'center center',
        transition: 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
        willChange: 'transform',
      }}
      className={`relative will-change-transform ${className}`}
    >
      {/* Top Fold Crease Lighting Effect */}
      {topCreaseIntensity > 0.02 && (
        <div
          aria-hidden="true"
          style={{ opacity: topCreaseIntensity }}
          className="absolute top-0 left-0 right-0 h-16 pointer-events-none rounded-t-2xl bg-gradient-to-b from-black/25 to-transparent z-10 transition-opacity duration-150"
        />
      )}

      {children}

      {/* Bottom Fold Crease Lighting Effect */}
      {bottomCreaseIntensity > 0.02 && (
        <div
          aria-hidden="true"
          style={{ opacity: bottomCreaseIntensity }}
          className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none rounded-b-2xl bg-gradient-to-t from-black/25 to-transparent z-10 transition-opacity duration-150"
        />
      )}
    </div>
  )
}

export default CanvasBendCard
