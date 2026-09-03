"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createRectCache } from "./rect-cache";
import { useConverterStore } from "../../store/useConverterStore";

export interface BendOptions {
  /** Height of the folded region at each edge in CSS pixels. */
  zone?: number;
  /** Maximum fold angle in degrees, reached away from the scroll ends. 90 is a cube edge. */
  angle?: number;
  /** Radius in CSS pixels of the circular arc that rounds each fold crease. 0 keeps a sharp cube edge. Clamped to the zone height. */
  rounding?: number;
  /** Perspective focal length in CSS pixels. Smaller values pinch the folded edges harder. */
  perspective?: number;
  /** "out" folds the edges away from the viewer like the outside of a cube, "in" tilts them toward the viewer. */
  direction?: "out" | "in";
  /** Scroll distance in CSS pixels over which an edge flattens near its scroll end. */
  ease?: number;
  /** Seconds the bend takes to settle after a scroll. 0 snaps instantly. */
  smoothing?: number;
  /** Bend the top edge. */
  top?: boolean;
  /** Bend the bottom edge. */
  bottom?: boolean;
  /** Overscroll tip strength (0 to 1). Rubber-banding past a scroll end tips the whole face over that edge. 0 disables. */
  tumble?: number;
  /** Pointer tilt strength (0 to 1). The face leans subtly toward the cursor. 0 disables. */
  tilt?: number;
  /** CSS rotation applied to the Bend host, used to keep pointer mapping aligned. */
  interactionRotation?: 0 | 90 | -90;
}

export interface BendElements {
  /** Canvas with layoutsubtree that hosts the HTML content. */
  source: HTMLCanvasElement;
  /** The scrollable element inside the source canvas that gets captured. */
  content: HTMLElement;
  /** Canvas the WebGL effect renders to. */
  output: HTMLCanvasElement;
}

export interface BendInstance {
  /** Update effect options live. */
  setOptions: (options: BendOptions) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const DEFAULTS: Required<BendOptions> = {
  zone: 240,
  angle: 80,
  rounding: 150,
  perspective: 700,
  direction: "in",
  ease: 240,
  smoothing: 0.1,
  top: true,
  bottom: true,
  tumble: 0.5,
  tilt: 0.5,
  interactionRotation: 0,
};

type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null;
  requestPaint?: () => void;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void;
};

const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uContent;
uniform float uZone;
uniform float uAngle;
uniform float uPersp;
uniform float uDir;
uniform float uTopAmt;
uniform float uBotAmt;
uniform float uMaxX;
uniform float uPxY;
uniform float uPxX;
uniform float uCover;
uniform vec3 uBg;
uniform float uTiltX;
uniform float uTiltY;
uniform float uPhi;
uniform float uRound;

vec3 foldEdge (float sy, float amt) {
  float yf = 1.0 - uZone;
  if (amt < 1e-4) return vec3(sy, 0.0, 1.0);
  float theta = uAngle * amt;
  if (uRound < 1e-4) {
    float s = sin(theta) * uDir;
    float c = cos(theta);
    float denom = max(c * uPersp + s * (0.5 - sy), 1e-5);
    float tRaw = uPersp * (sy - yf) / denom;
    float t = clamp(tRaw, 0.0, uZone);
    float z = max(t * s, -0.85 * uPersp);
    float alpha = 1.0 - smoothstep(uZone, uZone + 2.0 * uPxY, tRaw);
    return vec3(yf + t, z, alpha);
  }
  if (sy <= yf) return vec3(sy, 0.0, 1.0);
  float R = min(uRound, uZone);
  float r = R / theta;
  float ca = cos(theta);
  float sa = sin(theta);
  float yA = r * sa;
  float zA = r * (1.0 - ca);
  float prevSy = yf;
  float prevZ = 0.0;
  float prevU = 0.0;
  float bestU = -1.0;
  float bestZ = 0.0;
  float maxSy = yf;
  float du = uZone / 40.0;
  for (int i = 1; i <= 40; i++) {
    float u = du * float(i);
    float Y;
    float Zm;
    if (u <= R) {
      float a = u / r;
      Y = r * sin(a);
      Zm = r * (1.0 - cos(a));
    } else {
      Y = yA + (u - R) * ca;
      Zm = zA + (u - R) * sa;
    }
    Y += yf;
    float Z = max(Zm * uDir, -0.85 * uPersp);
    float scr = 0.5 + (Y - 0.5) * uPersp / (uPersp + Z);
    if ((prevSy - sy) * (scr - sy) <= 0.0 && abs(scr - prevSy) > 1e-7) {
      float f = clamp((sy - prevSy) / (scr - prevSy), 0.0, 1.0);
      bestU = mix(prevU, u, f);
      bestZ = mix(prevZ, Z, f);
      if (uDir > 0.0) break;
    }
    maxSy = max(maxSy, scr);
    prevSy = scr;
    prevZ = Z;
    prevU = u;
  }
  if (bestU < 0.0) {
    float alpha = 1.0 - smoothstep(maxSy - uPxY, maxSy + uPxY, sy);
    return vec3(1.0, prevZ, alpha);
  }
  return vec3(yf + bestU, bestZ, 1.0);
}

vec2 tipPlane (float sy, float phi) {
  float s = sin(phi);
  float c = cos(phi);
  float denom = max(c * uPersp + s * (sy - 0.5), 1e-4);
  float t = uPersp * (1.0 - sy) / denom;
  return vec2(1.0 - t, t * s);
}

void main () {
  vec2 uv = vUv;
  float cx = uMaxX * 0.5;
  float zSum = 0.0;

  if (abs(uPhi) > 1e-4) {
    if (uPhi > 0.0) {
      vec2 r = tipPlane(uv.y, uPhi);
      uv.y = r.x;
      zSum += r.y;
    } else {
      vec2 r = tipPlane(1.0 - uv.y, -uPhi);
      uv.y = 1.0 - r.x;
      zSum += r.y;
    }
  }

  float zG = uTiltX * (uv.x - cx) + uTiltY * (uv.y - 0.5);
  zSum += zG;
  uv.y = 0.5 + (uv.y - 0.5) * (uPersp + zG) / uPersp;

  float inTop = step(1.0 - uZone, uv.y);
  float inBot = step(uv.y, uZone);

  vec3 top = foldEdge(uv.y, uTopAmt);
  vec3 bot = foldEdge(1.0 - uv.y, uBotAmt);

  float srcY = uv.y;
  srcY = mix(srcY, top.x, inTop);
  srcY = mix(srcY, 1.0 - bot.x, inBot);

  zSum += inTop * top.y + inBot * bot.y;
  float alpha = mix(1.0, top.z, inTop) * mix(1.0, bot.z, inBot);

  float srcX = cx + (uv.x - cx) * (uPersp + zSum) / uPersp;

  alpha *= smoothstep(-2.0 * uPxX, 0.0, srcX);
  alpha *= 1.0 - smoothstep(uMaxX, uMaxX + 2.0 * uPxX, srcX);
  alpha *= smoothstep(-2.0 * uPxY, 0.0, srcY);
  alpha *= 1.0 - smoothstep(1.0, 1.0 + 2.0 * uPxY, srcY);

  vec2 p = vec2(
    clamp(srcX, 0.0005, uMaxX - 0.0005),
    clamp(srcY, 0.0005, 0.9995)
  );
  vec4 base = texture(uContent, vec2(p.x, 1.0 - p.y));

  outColor = vec4(mix(uBg, base.rgb, alpha * base.a), uCover);
}`;

export function supportsHtmlInCanvas(): boolean {
  if (typeof document === "undefined") return false;
  const probe = document.createElement("canvas") as PaintableCanvas;
  const ctx = probe.getContext("2d") as ElementImageContext | null;
  return Boolean(
    ctx &&
    typeof ctx.drawElementImage === "function" &&
    typeof probe.requestPaint === "function",
  );
}

const CONTENT_ATTR = "data-canvasui-content";
const CURSOR_ATTR = "data-canvasui-cursor";

export function createBend(
  elements: BendElements,
  options: BendOptions = {},
): BendInstance | null {
  const config = { ...DEFAULTS, ...options };
  const { source, content, output } = elements;

  const gl = output.getContext("webgl2", {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: false,
  });
  if (!gl || gl.isContextLost()) return null;

  const sourceCtx = source.getContext("2d") as ElementImageContext | null;
  const paintable = source as PaintableCanvas;
  const htmlInCanvas = Boolean(
    sourceCtx &&
    typeof sourceCtx.drawElementImage === "function" &&
    typeof paintable.requestPaint === "function",
  );

  let contentDirty = false;
  let wake = () => {};

  if (htmlInCanvas) {
    paintable.onpaint = () => {
      try {
        sourceCtx!.reset();
        sourceCtx!.drawElementImage!(content, 0, 0);
        contentDirty = true;
        wake();
      } catch {}
    };
  }

  function compile(type: number, text: string): WebGLShader {
    const shader = gl!.createShader(type)!;
    gl!.shaderSource(shader, text);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      console.error("Bend shader error:", gl!.getShaderInfoLog(shader));
    }
    return shader;
  }

  const vertexShader = compile(gl.VERTEX_SHADER, VERT);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const uniforms: Record<string, WebGLUniformLocation> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i)!;
    uniforms[info.name] = gl.getUniformLocation(program, info.name)!;
  }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const contentTexture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, contentTexture);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 0]),
  );
  gl.generateMipmap(gl.TEXTURE_2D);

  let contentMaxX = 1;

  let bg: [number, number, number] = [0, 0, 0];
  const bgProbe = document.createElement("canvas");
  bgProbe.width = bgProbe.height = 1;
  const bgCtx = bgProbe.getContext("2d", { willReadFrequently: true });

  function syncBgColor() {
    if (!bgCtx) return;
    let el: Element | null = content;
    while (el) {
      const css = getComputedStyle(el).backgroundColor;
      if (css && css !== "transparent") {
        bgCtx.clearRect(0, 0, 1, 1);
        bgCtx.fillStyle = css;
        bgCtx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = bgCtx.getImageData(0, 0, 1, 1).data;
        if (a > 0) {
          bg = [r / 255, g / 255, b / 255];
          return;
        }
      }
      el = el.parentElement;
    }
    bg = [0, 0, 0];
  }

  function syncCanvasSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(output.clientWidth * dpr));
    const height = Math.max(1, Math.round(output.clientHeight * dpr));
    if (output.width !== width || output.height !== height) {
      output.width = width;
      output.height = height;
    }
    contentMaxX = Math.min(
      1,
      Math.max(0.05, content.clientWidth / Math.max(output.clientWidth, 1)),
    );
    if (htmlInCanvas) {
      const cssWidth = Math.max(1, Math.round(source.clientWidth));
      const cssHeight = Math.max(1, Math.round(source.clientHeight));
      if (source.width !== cssWidth * dpr || source.height !== cssHeight * dpr) {
        source.width = cssWidth * dpr;
        source.height = cssHeight * dpr;
      }
      paintable.requestPaint!();
    }
  }

  let topTarget = 0;
  let bottomTarget = 0;
  let topCurrent = 0;
  let bottomCurrent = 0;
  let over = 0;
  let phiCurrent = 0;
  let tiltXTarget = 0;
  let tiltYTarget = 0;
  let tiltXCurrent = 0;
  let tiltYCurrent = 0;

  function syncScroll() {
    const max = content.scrollHeight - content.clientHeight;
    const t = content.scrollTop;
    const e = Math.max(config.ease, 1);
    const ramp = (v: number) => {
      const x = Math.min(Math.max(v / e, 0), 1);
      return x * x * (3 - 2 * x);
    };
    topTarget = max > 1 && config.top ? ramp(t) : 0;
    bottomTarget = max > 1 && config.bottom ? ramp(max - t) : 0;
  }

  syncCanvasSize();
  syncScroll();
  syncBgColor();

  function uploadContent() {
    if (!htmlInCanvas || !contentDirty) return;
    contentDirty = false;
    syncBgColor();
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.texImage2D(
      gl!.TEXTURE_2D,
      0,
      gl!.RGBA,
      gl!.RGBA,
      gl!.UNSIGNED_BYTE,
      source,
    );
    gl!.generateMipmap(gl!.TEXTURE_2D);
  }

  function render() {
    uploadContent();
    const h = Math.max(output.clientHeight, 1);
    const w = Math.max(output.clientWidth, 1);
    const zoneFrac = Math.min(Math.max(config.zone, 8) / h, 0.49);
    gl!.useProgram(program);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.uniform1i(uniforms.uContent, 0);
    gl!.uniform1f(uniforms.uZone, zoneFrac);
    gl!.uniform1f(
      uniforms.uAngle,
      Math.min(Math.max(config.angle, 1), 160) * (Math.PI / 180),
    );
    gl!.uniform1f(uniforms.uPersp, Math.max(config.perspective, 50) / h);
    gl!.uniform1f(uniforms.uDir, config.direction === "in" ? -1 : 1);
    gl!.uniform1f(uniforms.uTopAmt, topCurrent);
    gl!.uniform1f(uniforms.uBotAmt, bottomCurrent);
    gl!.uniform1f(uniforms.uMaxX, contentMaxX);
    gl!.uniform1f(uniforms.uPxY, 1.5 / h);
    gl!.uniform1f(uniforms.uPxX, 1.5 / w);
    gl!.uniform1f(uniforms.uCover, htmlInCanvas ? 1 : 0);
    gl!.uniform3f(uniforms.uBg, bg[0], bg[1], bg[2]);
    gl!.uniform1f(uniforms.uTiltX, tiltXCurrent);
    gl!.uniform1f(uniforms.uTiltY, tiltYCurrent);
    gl!.uniform1f(uniforms.uPhi, phiCurrent);
    gl!.uniform1f(
      uniforms.uRound,
      Math.min(Math.max(config.rounding, 0) / h, zoneFrac),
    );
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, output.width, output.height);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  let raf = 0;
  let lastTime = performance.now();
  let destroyed = false;
  let running = false;
  let visible = true;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;

  function frame(now: number) {
    if (destroyed) return;
    if (!visible) {
      running = false;
      return;
    }
    const delta = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;
    const tau = config.smoothing;
    const k =
      reducedMotion || tau <= 0
        ? 1
        : 1 - Math.exp(-delta / Math.max(tau, 1e-4));
    topCurrent += (topTarget - topCurrent) * k;
    bottomCurrent += (bottomTarget - bottomCurrent) * k;
    if (Math.abs(topTarget - topCurrent) < 0.001) topCurrent = topTarget;
    if (Math.abs(bottomTarget - bottomCurrent) < 0.001)
      bottomCurrent = bottomTarget;

    over *= Math.exp(-delta / 0.22);
    if (Math.abs(over) < 0.5) over = 0;
    const phiTarget =
      reducedMotion || config.tumble <= 0
        ? 0
        : Math.tanh(over / 500) * 0.4 * Math.min(config.tumble, 1);
    phiCurrent += (phiTarget - phiCurrent) * Math.min(delta / 0.09, 1);
    if (phiTarget === 0 && Math.abs(phiCurrent) < 1e-4) phiCurrent = 0;

    if (reducedMotion || config.tilt <= 0) {
      tiltXTarget = 0;
      tiltYTarget = 0;
    }
    const kT = Math.min(delta / 0.15, 1);
    tiltXCurrent += (tiltXTarget - tiltXCurrent) * kT;
    tiltYCurrent += (tiltYTarget - tiltYCurrent) * kT;
    if (Math.abs(tiltXTarget - tiltXCurrent) < 1e-4) tiltXCurrent = tiltXTarget;
    if (Math.abs(tiltYTarget - tiltYCurrent) < 1e-4) tiltYCurrent = tiltYTarget;

    render();
    if (
      !contentDirty &&
      topCurrent === topTarget &&
      bottomCurrent === bottomTarget &&
      over === 0 &&
      phiCurrent === 0 &&
      tiltXCurrent === tiltXTarget &&
      tiltYCurrent === tiltYTarget
    ) {
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (destroyed || running || !visible) return;
    running = true;
    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  wake = start;
  start();

  function onScroll() {
    syncScroll();
    if (htmlInCanvas) paintable.requestPaint!();
    start();
  }
  content.addEventListener("scroll", onScroll, { passive: true });

  const rectCache = createRectCache(output);

  function onPointerMove(event: PointerEvent) {
    if (!event.isPrimary) return;
    if (config.tilt > 0 && !reducedMotion) {
      const rect = rectCache.current;
      if (rect.width > 0 && rect.height > 0) {
        const nx = (event.clientX - rect.left) / rect.width - 0.5;
        const ny = 0.5 - (event.clientY - rect.top) / rect.height;
        const amp = Math.min(config.tilt, 1) * 0.14;
        tiltXTarget = -nx * amp;
        tiltYTarget = -ny * amp;
        start();
      }
    }
  }
  content.addEventListener("pointermove", onPointerMove, { passive: true });

  function onPointerLeave() {
    tiltXTarget = 0;
    tiltYTarget = 0;
    start();
  }
  content.addEventListener("pointerleave", onPointerLeave);

  function onMotionChange() {
    reducedMotion = motionQuery.matches;
    start();
  }
  motionQuery.addEventListener("change", onMotionChange);

  const observer = new ResizeObserver(() => {
    syncCanvasSize();
    syncScroll();
    start();
  });
  observer.observe(output);
  observer.observe(content);

  const intersection = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]?.isIntersecting ?? true;
    if (visible) start();
  });
  intersection.observe(output);

  return {
    setOptions(next) {
      if (
        !Object.entries(next).some(
          ([key, value]) => config[key as keyof BendOptions] !== value,
        )
      )
        return;
      Object.assign(config, next);
      syncScroll();
      start();
    },
    resize() {
      syncCanvasSize();
      syncScroll();
      start();
    },
    destroy() {
      destroyed = true;
      rectCache.destroy();
      cancelAnimationFrame(raf);
      content.removeAttribute(CONTENT_ATTR);
      content.removeAttribute(CURSOR_ATTR);
      content.removeEventListener("scroll", onScroll);
      content.removeEventListener("pointermove", onPointerMove);
      content.removeEventListener("pointerleave", onPointerLeave);
      observer.disconnect();
      intersection.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      gl!.deleteTexture(contentTexture);
      gl!.deleteProgram(program);
      gl!.deleteShader(vertexShader);
      gl!.deleteShader(fragmentShader);
      gl!.deleteBuffer(quad);
      if (htmlInCanvas) paintable.onpaint = null;
    },
  };
}

export interface BendProps extends BendOptions {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const emptySubscribe = () => () => {};

export function Bend({ children, className, style, ...options }: BendProps) {
  const { motionMode } = useConverterStore();
  const sourceRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<BendInstance | null>(null);
  const [initialOptions] = useState(options);
  const [failed, setFailed] = useState(false);

  // Dynamic CSS 3D Scroll Bend motion states (active across all mobile and desktop devices)
  const [bendTransform, setBendTransform] = useState<string>("");
  const lastScrollYRef = useRef(0);
  const scrollTimeoutRef = useRef<number | null>(null);

  const supported = useSyncExternalStore(
    emptySubscribe,
    supportsHtmlInCanvas,
    () => false,
  );
  const native = supported && !failed && motionMode !== "off";

  useEffect(() => {
    const source = sourceRef.current;
    const content = contentRef.current;
    const output = outputRef.current;
    if (!source || !content || !output) return;

    if (native) {
      instanceRef.current = createBend(
        { source, content, output },
        initialOptions,
      );
      if (!instanceRef.current) setFailed(true);
    }

    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [initialOptions, native]);

  useEffect(() => {
    instanceRef.current?.setOptions(options);
  });

  // Kinetic CSS 3D Scroll Bend handler:
  // When scrolling on mobile or desktop, dynamically curves the content along the 3D cylindrical fold axis
  const handleScrollMotion = (e: React.UIEvent<HTMLDivElement>) => {
    if (motionMode === "off") return;

    const el = e.currentTarget;
    const currentScrollY = el.scrollTop;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const scrollDelta = currentScrollY - lastScrollYRef.current;
    lastScrollYRef.current = currentScrollY;

    // Calculate kinetic velocity fold
    const velocity = Math.min(Math.max(scrollDelta * 0.4, -14), 14);

    // Over-edge curvature dampening
    let edgeCurve = 0;
    if (currentScrollY <= 20) {
      edgeCurve = (20 - currentScrollY) * 0.3; // top fold edge
    } else if (maxScroll - currentScrollY <= 20) {
      edgeCurve = -(20 - (maxScroll - currentScrollY)) * 0.3; // bottom fold edge
    }

    const angle = velocity + edgeCurve;

    setBendTransform(
      `perspective(800px) rotateX(${angle.toFixed(1)}deg) scale(${
        1 - Math.abs(angle) * 0.005
      }) translateZ(${(-Math.abs(angle) * 2).toFixed(1)}px)`,
    );

    if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(() => {
      setBendTransform("perspective(800px) rotateX(0deg) scale(1) translateZ(0px)");
    }, 180);
  };

  // Touch / pointer tilt interaction on mobile
  const handleTouchTilt = (e: React.TouchEvent<HTMLDivElement>) => {
    if (motionMode !== "full") return;
    const touch = e.touches[0];
    if (!touch || !contentRef.current) return;
    const rect = contentRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left - rect.width / 2;
    const y = touch.clientY - rect.top - rect.height / 2;

    const rotX = (-(y / (rect.height / 2)) * 4).toFixed(1);
    const rotY = ((x / (rect.width / 2)) * 4).toFixed(1);

    setBendTransform(
      `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(0.99)`,
    );
  };

  const handleTouchEnd = () => {
    setBendTransform("perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)");
  };

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className || ""}`}
      style={{ position: "relative", ...style }}
    >
      <canvas
        ref={sourceRef}
        // @ts-expect-error experimental html-in-canvas attribute
        layoutsubtree="true"
        suppressHydrationWarning
        style={
          native
            ? { position: "absolute", inset: 0, width: "100%", height: "100%" }
            : { display: "none" }
        }
      >
        {native ? (
          <div
            ref={contentRef}
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              overflow: "auto",
            }}
          >
            {children}
          </div>
        ) : null}
      </canvas>

      {!native ? (
        <div
          ref={contentRef}
          onScroll={handleScrollMotion}
          onTouchMove={handleTouchTilt}
          onTouchEnd={handleTouchEnd}
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            overflow: "auto",
            transform: motionMode === "off" ? "none" : bendTransform,
            transformOrigin: "center center",
            transition:
              bendTransform === "perspective(800px) rotateX(0deg) scale(1) translateZ(0px)"
                ? "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)"
                : "transform 0.08s ease-out",
            willChange: "transform",
          }}
          className="scroll-smooth"
        >
          {children}
        </div>
      ) : null}

      <canvas
        ref={outputRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export default Bend;
