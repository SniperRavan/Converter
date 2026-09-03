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

// Canvas UI Bend Card with real kinetic 3D scroll bend and edge fold motion
// Faithful to Canvas UI's Cube Face fold with mobile touch support and reduced-motion compliance
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
  const isInteractingRef = useRef(false)

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

      // Smooth settling back to resting state
      if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = window.setTimeout(() => {
        if (!isInteractingRef.current) {
          setBendTransform('perspective(900px) rotateX(0deg) scale(1) translateZ(0px)')
          setTopCreaseIntensity(0)
          setBottomCreaseIntensity(0)
        }
      }, 160)
    }

    scrollParent.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      scrollParent?.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current)
    }
  }, [motionMode, zone, maxAngle])

  // Desktop Pointer Movement: Subtle interactive hover tilt
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (motionMode !== 'full') return
    isInteractingRef.current = true
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotX = ((y - centerY) / centerY) * -3.5
    const rotY = ((x - centerX) / centerX) * 3.5

    setBendTransform(`perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(3px)`)
  }

  const handlePointerLeave = () => {
    isInteractingRef.current = false
    setBendTransform('perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)')
    setTopCreaseIntensity(0)
    setBottomCreaseIntensity(0)
  }

  // Mobile Touch Movement: Natural kinetic tipping
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (motionMode === 'off') return
    isInteractingRef.current = true
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
    isInteractingRef.current = false
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
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: bendTransform || undefined,
        transformOrigin: 'center center',
        transition: isInteractingRef.current
          ? 'transform 0.06s ease-out'
          : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
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
