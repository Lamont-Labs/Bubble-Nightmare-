# The Hollow Harvest — Foundation

A standalone Babylon.js exploration prototype. Walk the pumpkin rows, circle the old barn, and follow the lantern path to the stone well.

- Desktop: WASD or arrows to move, drag to look, Q/E to orbit, Shift to sprint, H for help.
- Touch: hold the left joystick to move and drag the field to look. Two fingers can operate both controls at once.
- WebGL is the default. Optional WebGPU falls back to WebGL if adapter creation or initialization fails. FPS and frame duration are sampled from the running render loop.
- Position and camera angle autosave to `hollow-harvest:foundation:v1`. Renderer preference uses `hollow-harvest:renderer`. Neither key touches Bubble Nightmare.

From the workspace root, install with `pnpm install --frozen-lockfile`, then:

```sh
pnpm --filter @workspace/hollow-harvest run typecheck
pnpm --filter @workspace/hollow-harvest run dev
pnpm --filter @workspace/hollow-harvest run build
pnpm --filter @workspace/hollow-harvest run serve
```

The static output is `artifacts/hollow-harvest/dist/public`. The default build uses relative asset URLs; Replit supplies the `/hollow-harvest/` base path for its preview and build. Serve the output over HTTP(S), not `file://`. No API server is required. This is not an APK project.
