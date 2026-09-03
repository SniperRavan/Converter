import React, { useState, useRef } from 'react'
import { useConverterStore } from '../store/useConverterStore'

interface CanvasBendCardProps {
  children: React.ReactNode
  className?: string
}

// Progressive Canvas UI Bend Card component
// Delivers organic perspective curvature on desktop cursor and mobile touch, with instant disable for reduced motion
export const CanvasBendCard: React.FC<CanvasBendCardProps> = ({ children, className = '' }) => {
  const { motionMode } = useConverterStore()
  const cardRef = useRef<HTMLDivElement>(null)
  const [transformStyle, setTransformStyle] = useState<string>('')

  // If motion is off or reduced, render completely static without calculations
  if (motionMode === 'off' || motionMode === 'reduced') {
    return <div className={`relative ${className}`}>{children}</div>
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Subtle gentle curvature (max 2.5 degrees) to keep text 100% readable
    const rotateX = ((y - centerY) / centerY) * -2.5
    const rotateY = ((x - centerX) / centerX) * 2.5

    setTransformStyle(`perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(2px)`)
  }

  const handlePointerLeave = () => {
    setTransformStyle('perspective(1200px) rotateX(0deg) rotateY(0deg) translateZ(0px)')
  }

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        transform: transformStyle,
        transition: 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
      }}
      className={`relative will-change-transform ${className}`}
    >
      {children}
    </div>
  )
}
