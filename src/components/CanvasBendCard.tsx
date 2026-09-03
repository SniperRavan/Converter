import React, { useState, useRef } from 'react'
import { useConverterStore } from '../store/useConverterStore'

interface CanvasBendCardProps {
  children: React.ReactNode
  className?: string
}

// Progressive Canvas UI Bend Card component
// Provides interactive perspective curvature on touch/cursor, respecting motion accessibility settings
export const CanvasBendCard: React.FC<CanvasBendCardProps> = ({ children, className = '' }) => {
  const { motionMode } = useConverterStore()
  const cardRef = useRef<HTMLDivElement>(null)
  const [transformStyle, setTransformStyle] = useState<string>('')

  // If motion is off or reduced, render completely static without calculations
  if (motionMode === 'off' || motionMode === 'reduced') {
    return <div className={`relative ${className}`}>{children}</div>
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = ((y - centerY) / centerY) * -4
    const rotateY = ((x - centerX) / centerX) * 4

    setTransformStyle(`perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(2px)`)
  }

  const handleMouseLeave = () => {
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)')
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transition: 'transform 0.15s ease-out',
      }}
      className={`relative will-change-transform ${className}`}
    >
      {children}
    </div>
  )
}
