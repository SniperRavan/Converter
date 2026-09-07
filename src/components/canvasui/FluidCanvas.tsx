import React, { useEffect, useRef } from 'react'
import { useConverterStore } from '../../store/useConverterStore'

export const FluidCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { motionMode, themeMode } = useConverterStore()

  useEffect(() => {
    if (motionMode === 'off') {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number | null = null
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)
    const isMobile = width < 768
    let isVisible = typeof document !== 'undefined' ? !document.hidden : true

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize, { passive: true })

    // Adaptive particle constellation: 75 desktop / 40 mobile (reduced: 30 desktop / 18 mobile)
    const particleCount =
      motionMode === 'reduced' ? (isMobile ? 18 : 30) : isMobile ? 40 : 75
    const filamentMaxDist = isMobile ? 105 : 145

    const particles: {
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      alpha: number
    }[] = []

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (motionMode === 'reduced' ? 0.18 : 0.42),
        vy: (Math.random() - 0.5) * (motionMode === 'reduced' ? 0.18 : 0.42),
        radius: Math.random() * 1.7 + 1.2,
        alpha: Math.random() * 0.45 + 0.35,
      })
    }

    // Off-screen default so no phantom repellent force at viewport center
    let mouseX = -2000
    let mouseY = -2000

    const handlePointerMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    const handleMouseLeave = () => {
      mouseX = -2000
      mouseY = -2000
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        mouseX = e.touches[0].clientX
        mouseY = e.touches[0].clientY
      }
    }

    const handleTouchEnd = () => {
      mouseX = -2000
      mouseY = -2000
    }

    window.addEventListener('mousemove', handlePointerMove, { passive: true })
    document.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('touchstart', handleTouchMove, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('touchcancel', handleTouchEnd)

    const render = () => {
      if (!isVisible) {
        animationFrameId = null
        return
      }

      ctx.clearRect(0, 0, width, height)

      const isDark = themeMode === 'dark'
      const baseColor = isDark ? '255, 255, 255' : '135, 125, 115'

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy

        // Bounce off bounds
        if (p.x < 0) {
          p.x = 0
          p.vx = Math.abs(p.vx)
        } else if (p.x > width) {
          p.x = width
          p.vx = -Math.abs(p.vx)
        }

        if (p.y < 0) {
          p.y = 0
          p.vy = Math.abs(p.vy)
        } else if (p.y > height) {
          p.y = height
          p.vy = -Math.abs(p.vy)
        }

        // Subtle interactive mouse / touch deflection
        if (motionMode === 'full' && mouseX > -1000) {
          const dx = mouseX - p.x
          const dy = mouseY - p.y
          const dist = Math.hypot(dx, dy)
          if (dist < 120 && dist > 0) {
            p.x -= (dx / dist) * 0.55
            p.y -= (dy / dist) * 0.55
          }
        }

        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${baseColor}, ${p.alpha * (isDark ? 0.72 : 0.45)})`
        ctx.fill()

        // Filament constellation lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y)
          if (dist < filamentMaxDist) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(${baseColor}, ${
              (1 - dist / filamentMaxDist) * (isDark ? 0.15 : 0.1)
            })`
            ctx.lineWidth = 0.75
            ctx.stroke()
          }
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    // Pause rendering entirely when browser tab is inactive or hidden to preserve battery
    const handleVisibility = () => {
      isVisible = !document.hidden
      if (isVisible) {
        if (!animationFrameId) {
          animationFrameId = requestAnimationFrame(render)
        }
      } else if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    // Start continuous gentle drift
    animationFrameId = requestAnimationFrame(render)

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handlePointerMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('touchstart', handleTouchMove)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [motionMode, themeMode])

  if (motionMode === 'off') return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-100"
    />
  )
}
