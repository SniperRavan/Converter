import React, { useEffect, useRef } from 'react'
import { useConverterStore } from '../../store/useConverterStore'

export const FluidCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { motionMode, themeMode } = useConverterStore()

  useEffect(() => {
    // Completely disable on mobile (<768px) or when motion is off to save battery and RAM
    if (motionMode === 'off' || (typeof window !== 'undefined' && window.innerWidth < 768)) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number | null = null
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)
    let isVisible = typeof document !== 'undefined' ? !document.hidden : true
    let isIdle = false
    let idleTimer: ReturnType<typeof setTimeout> | null = null

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize, { passive: true })

    // Lightweight particle constellation: 16 particles in full mode, 8 in reduced mode
    const particleCount = motionMode === 'reduced' ? 8 : 16
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
        vx: (Math.random() - 0.5) * (motionMode === 'reduced' ? 0.15 : 0.4),
        vy: (Math.random() - 0.5) * (motionMode === 'reduced' ? 0.15 : 0.4),
        radius: Math.random() * 1.5 + 1,
        alpha: Math.random() * 0.35 + 0.1,
      })
    }

    let mouseX = width / 2
    let mouseY = height / 2

    const wakeUp = () => {
      isIdle = false
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        isIdle = true
      }, 6000)
      if (isVisible && !animationFrameId) {
        animationFrameId = requestAnimationFrame(render)
      }
    }

    const handlePointerMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      wakeUp()
    }

    window.addEventListener('mousemove', handlePointerMove, { passive: true })

    // Pause rendering entirely when browser tab is inactive or hidden
    const handleVisibility = () => {
      isVisible = !document.hidden
      if (isVisible) {
        wakeUp()
      } else if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    const render = () => {
      if (!isVisible || (isIdle && motionMode === 'reduced')) {
        animationFrameId = null
        return
      }

      ctx.clearRect(0, 0, width, height)

      const isDark = themeMode === 'dark'
      const baseColor = isDark ? '255, 255, 255' : '150, 140, 130'

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy

        // Bounce off bounds
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1

        // Subtle mouse interaction
        if (motionMode === 'full') {
          const dx = mouseX - p.x
          const dy = mouseY - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100 && dist > 0) {
            p.x -= (dx / dist) * 0.5
            p.y -= (dy / dist) * 0.5
          }
        }

        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${baseColor}, ${p.alpha * (isDark ? 0.3 : 0.15)})`
        ctx.fill()

        // Filament lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(${baseColor}, ${
              (1 - dist / 120) * 0.06 * (isDark ? 1 : 0.5)
            })`
            ctx.lineWidth = 0.7
            ctx.stroke()
          }
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    wakeUp()

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (idleTimer) clearTimeout(idleTimer)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handlePointerMove)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [motionMode, themeMode])

  if (motionMode === 'off') return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-80"
    />
  )
}
