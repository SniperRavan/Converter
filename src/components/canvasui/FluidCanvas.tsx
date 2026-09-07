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
    let isIdle = false
    let idleTimer: ReturnType<typeof setTimeout> | null = null

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize, { passive: true })

    // Adaptive particle constellation: 42 desktop / 22 mobile (reduced: 18 desktop / 12 mobile)
    const particleCount = motionMode === 'reduced' ? (isMobile ? 12 : 18) : (isMobile ? 22 : 42)
    const filamentMaxDist = isMobile ? 105 : 140
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
        vx: (Math.random() - 0.5) * (motionMode === 'reduced' ? 0.18 : 0.45),
        vy: (Math.random() - 0.5) * (motionMode === 'reduced' ? 0.18 : 0.45),
        radius: Math.random() * 1.6 + 1.2,
        alpha: Math.random() * 0.45 + 0.3,
      })
    }

    let mouseX = width / 2
    let mouseY = height / 2

    const wakeUp = () => {
      isIdle = false
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        isIdle = true
      }, 3000)
      if (isVisible && !animationFrameId) {
        animationFrameId = requestAnimationFrame(render)
      }
    }

    const handlePointerMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      wakeUp()
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        mouseX = e.touches[0].clientX
        mouseY = e.touches[0].clientY
        wakeUp()
      }
    }

    window.addEventListener('mousemove', handlePointerMove, { passive: true })
    window.addEventListener('touchstart', handleTouchMove, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })

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
      if (!isVisible || isIdle) {
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

        // Subtle mouse or touch interaction
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
        ctx.fillStyle = `rgba(${baseColor}, ${p.alpha * (isDark ? 0.65 : 0.35)})`
        ctx.fill()

        // Filament lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y)
          if (dist < filamentMaxDist) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(${baseColor}, ${
              (1 - dist / filamentMaxDist) * 0.12 * (isDark ? 1 : 0.6)
            })`
            ctx.lineWidth = 0.75
            ctx.stroke()
          }
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    // Paint initial stationary layout frame without starting continuous loop
    render()
    isIdle = true
    animationFrameId = null

    // Defer interactive animation loop until idle to ensure 0ms main-thread contention at load
    let idleHandle: any = null
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleHandle = (window as any).requestIdleCallback(wakeUp, { timeout: 3000 })
    } else {
      idleHandle = setTimeout(wakeUp, 2000)
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (idleTimer) clearTimeout(idleTimer)
      if (idleHandle) {
        if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
          (window as any).cancelIdleCallback(idleHandle)
        } else {
          clearTimeout(idleHandle)
        }
      }
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('touchstart', handleTouchMove)
      window.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [motionMode, themeMode])

  if (motionMode === 'off') return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-95"
    />
  )
}
