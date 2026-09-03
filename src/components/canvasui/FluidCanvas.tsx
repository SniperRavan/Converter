import React, { useEffect, useRef } from 'react'
import { useConverterStore } from '../../store/useConverterStore'

export const FluidCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { motionMode, themeMode } = useConverterStore()

  useEffect(() => {
    if (motionMode === 'off') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    // Particle nodes for fluid ambient constellation
    const particleCount = motionMode === 'reduced' ? 15 : 35
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
        vx: (Math.random() - 0.5) * (motionMode === 'reduced' ? 0.2 : 0.6),
        vy: (Math.random() - 0.5) * (motionMode === 'reduced' ? 0.2 : 0.6),
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.4 + 0.1,
      })
    }

    let mouseX = width / 2
    let mouseY = height / 2

    const handlePointerMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    if (motionMode === 'full') {
      window.addEventListener('mousemove', handlePointerMove, { passive: true })
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      const isDark = themeMode === 'dark'
      const baseColor = isDark ? '99, 102, 241' : '59, 130, 246' // indigo / blue

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy

        // Bounce off walls
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1

        // Mouse gentle repulsion / pull in full motion mode
        if (motionMode === 'full') {
          const dx = mouseX - p.x
          const dy = mouseY - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120 && dist > 0) {
            p.x -= (dx / dist) * 0.8
            p.y -= (dy / dist) * 0.8
          }
        }

        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${baseColor}, ${p.alpha * (isDark ? 0.35 : 0.2)})`
        ctx.fill()

        // Connect nearby particles with subtle filaments
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y)
          if (dist < 140) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(${baseColor}, ${
              (1 - dist / 140) * 0.08 * (isDark ? 1 : 0.6)
            })`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handlePointerMove)
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
