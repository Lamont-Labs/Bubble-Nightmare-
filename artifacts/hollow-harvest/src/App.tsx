import { useEffect, useRef, useState } from 'react';
import { startGame } from './game/runtime';

type Mode = 'webgl' | 'webgpu';
type Stats = { fps: number; ms: number; backend: string; notice: string; location: string; wisps: number; totalWisps: number; nearby: { id: string; kind: 'wisp' | 'family'; label: string } | null; dialogue: { speaker: string; text: string } | null; guidance: { name: string; distance: number; angle: number } | null };

const MODE_KEY = 'hollow-harvest:renderer';
const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;

function initialMode(): Mode {
  try {
    const m = localStorage.getItem(MODE_KEY);
    if (m === 'webgl' || m === 'webgpu') return m;
  } catch {
    /* ignore */
  }
  return 'webgl';
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const interactRef = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [stats, setStats] = useState<Stats>({ fps: 0, ms: 0, backend: 'waking', notice: '', location: 'The Hollow', wisps: 0, totalWisps: 3, nearby: null, dialogue: null, guidance: null });
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [help, setHelp] = useState(false);
  const [touch, setTouch] = useState(false);
  const [lookHint, setLookHint] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const upd = () => setTouch(mq.matches || navigator.maxTouchPoints > 0);
    upd();
    mq.addEventListener('change', upd);
    const t = window.setTimeout(() => setLookHint(false), 9000);
    return () => { mq.removeEventListener('change', upd); window.clearTimeout(t); };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(MODE_KEY, mode); } catch { /* ignore */ }
    const canvas = canvasRef.current;
    const stick = stickRef.current;
    const interactButton = interactRef.current;
    if (!canvas || !stick || !interactButton) return;
    const ac = new AbortController();
    let dispose: (() => void) | null = null;
    setError('');
    setReady(false);
    startGame(canvas, stick, interactButton, mode, (s) => { if (!ac.signal.aborted) { setStats(s); setReady(true); } }, ac.signal)
      .then((d) => { if (ac.signal.aborted) d(); else dispose = d; })
      .catch((e: unknown) => { if (!ac.signal.aborted) setError(e instanceof Error ? e.message : String(e)); });
    return () => { ac.abort(); dispose?.(); };
  }, [mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' || e.key === 'h' || e.key === 'H') setHelp((v) => !v);
      else if (e.key === 'Escape') setHelp(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const fps = Math.round(stats.fps);

  return (
    <main className="hh-root" data-testid="game-root">
      <canvas
        ref={canvasRef}
        className="hh-canvas"
        tabIndex={0}
        aria-label="The Hollow Harvest game world. Drag to look, WASD or arrows to move, Q and E to orbit, Shift to sprint."
        data-testid="canvas-game"
        onPointerDown={() => setLookHint(false)}
      />
      <div className="hh-vignette" aria-hidden />
      <div className="hh-grain" aria-hidden style={{ position: 'fixed' }} />

      <div
        className="hh-veil pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{ opacity: ready || error ? 0 : 1, background: 'hsl(228 34% 6%)' }}
        aria-hidden={ready}
      >
        <div className="text-center">
          <p className="hh-eyebrow">The moon is rising</p>
          <p className="hh-title mt-3 text-4xl">Stuffing the <em>straw</em></p>
        </div>
      </div>

      <header className="hh-topbar pointer-events-none absolute left-0 right-0 top-0 flex items-start justify-between gap-4 p-4 sm:p-6"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
        <div>
          <p className="hh-eyebrow">A scarecrow wakes</p>
          <h1 className="hh-title mt-2 text-3xl sm:text-5xl">The Hollow <em>Harvest</em></h1>
          <p key={stats.location} className="hh-loc hh-loc-anim mt-2 flex items-center gap-2" data-testid="text-location">
            <span className="hh-dot" aria-hidden /> {stats.location}
          </p>
          <div className={`hh-panel hh-objective mt-4 px-3 py-2${stats.wisps === stats.totalWisps ? ' hh-objective-complete' : ''}`} data-testid="panel-objective" aria-live="off">
            <span className="hh-eyebrow">{stats.wisps === stats.totalWisps ? 'The field remembers' : 'The first harvest'}</span>
            <span className="hh-objective-count"><b data-testid="text-wisp-count">{stats.wisps}</b><span className="opacity-40"> / </span>{stats.totalWisps} lost embers</span>
            {stats.guidance && <span className="hh-guidance" data-testid="text-guidance"><span className="hh-guide-arrow" style={{ transform: `rotate(${stats.guidance.angle}rad)` }} aria-hidden>↑</span><span>Next: {stats.guidance.name} · {Math.round(stats.guidance.distance)}m</span></span>}
            {stats.wisps === stats.totalWisps && <span className="hh-objective-finish" data-testid="text-harvest-complete">The Hollow remembers its own.</span>}
          </div>
        </div>
        <div className="hh-controls pointer-events-auto flex flex-col items-end gap-2">
          <div className="hh-panel hh-stat flex items-center gap-3 px-3 py-2" data-testid="status-perf" aria-live="off">
            <span><b data-testid="text-fps">{fps}</b> fps</span>
            <span className="opacity-40">/</span>
            <span><b data-testid="text-ms">{stats.ms.toFixed(1)}</b> ms</span>
            <span className="opacity-40">/</span>
            <span className="uppercase tracking-widest" data-testid="text-backend">{stats.backend}</span>
          </div>
          <div className="hh-panel flex items-center gap-1 p-1" role="group" aria-label="Renderer">
            <button className="hh-btn" aria-pressed={mode === 'webgl'} onClick={() => setMode('webgl')} data-testid="button-renderer-webgl">WebGL</button>
            <button className="hh-btn" aria-pressed={mode === 'webgpu'} disabled={!hasWebGPU} title={hasWebGPU ? 'Use WebGPU' : 'WebGPU unavailable in this browser'} onClick={() => setMode('webgpu')} data-testid="button-renderer-webgpu">WebGPU</button>
            <button className="hh-btn" aria-expanded={help} aria-controls="hh-help" onClick={() => setHelp((v) => !v)} data-testid="button-help">Help</button>
          </div>
        </div>
      </header>

      {(stats.notice || error) && (
        <div className="hh-panel hh-help pointer-events-none absolute left-1/2 top-1/2 sm:top-auto sm:bottom-8 max-w-sm -translate-x-1/2 px-4 py-3 text-center text-xs" role="status" data-testid="status-notice">
          {error ? <span style={{ color: 'hsl(var(--destructive))' }}>The field went dark: {error}</span> : stats.notice}
        </div>
      )}

      {help && (
        <div id="hh-help" className="hh-panel hh-help absolute right-4 top-36 w-[min(320px,calc(100vw-32px))] p-5 sm:right-6" role="dialog" aria-label="How to play" data-testid="panel-help">
          <p className="hh-eyebrow">Field notes</p>
          <p className="hh-title mt-2 text-2xl">Walk the <em>rows</em></p>
          <ul className="mt-4 space-y-2 text-xs" style={{ color: 'hsl(var(--moon)/.9)' }}>
            <li><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or arrows to move</li>
            <li>Drag the field to look around</li>
            <li><kbd>Q</kbd> <kbd>E</kbd> orbit the camera</li>
            <li>Hold <kbd>Shift</kbd> to sprint</li>
            <li>Walk close to a family member or ember and press <kbd>F</kbd></li>
            <li>On touch: left stick moves, drag elsewhere looks, tap the nearby prompt</li>
            <li><kbd>H</kbd> toggles these notes</li>
          </ul>
          <p className="mt-4 text-[11px] opacity-60">Find the three lost embers near the barn, rows, and well, then talk to your family at the lantern circle. Your harvest is saved automatically.</p>
          <button className="hh-btn mt-3 -ml-3" onClick={() => { setHelp(false); canvasRef.current?.focus(); }} data-testid="button-close-help">Back to the field</button>
        </div>
      )}

      <div ref={stickRef} className="hh-stick" style={{ display: touch ? 'block' : 'none' }} aria-label="Movement joystick" data-testid="control-joystick">
        <div className="hh-knob" />
      </div>

      {stats.dialogue && (
        <div className="hh-dialogue hh-panel" role="status" data-testid="text-dialogue">
          <span className="hh-eyebrow">{stats.dialogue.speaker}</span>
          <p className="hh-dialogue-line">“{stats.dialogue.text}”</p>
        </div>
      )}

      {touch && lookHint && (
        <p className="hh-hint hh-eyebrow pointer-events-none absolute right-6 text-right" style={{ bottom: 'max(36px, env(safe-area-inset-bottom))' }} data-testid="text-look-hint">
          Drag here to look
        </p>
      )}

      <button
        ref={interactRef}
        className="hh-interact"
        type="button"
        hidden
        aria-label="Interact with the nearby character or lost ember"
        data-testid="button-gather"
      >Interact</button>

      {!touch && (
        <p className="hh-eyebrow pointer-events-none absolute bottom-5 left-6 opacity-70">
          <kbd>WASD</kbd> move · drag look · <kbd>Q</kbd><kbd>E</kbd> orbit · <kbd>F</kbd> interact · <kbd>Shift</kbd> sprint · <kbd>H</kbd> help
        </p>
      )}
    </main>
  );
}

export default App;
