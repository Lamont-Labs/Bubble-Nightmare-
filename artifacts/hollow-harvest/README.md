# The Hollow Harvest — Foundation

A standalone Babylon.js exploration prototype. Walk the pumpkin rows, circle the old barn, and follow the lantern path to the stone well.

- Goal: talk to the family at the lantern circle, then find three lost embers near the pumpkin row, barn, and stone well.
- The family includes Dad with a horned mask, straw-haired Mom, and the rabbit- and pig-masked teens. Walk close to hear each one; their lines change after the embers are restored.
- A small arrow and distance point toward the nearest uncollected ember and update as you move.
- Desktop: WASD or arrows to move, drag to look, Q/E to orbit, Shift to sprint, F to talk or gather, H for help.
- Touch: hold the left joystick to move, drag the field to look, and tap the nearby interaction prompt. Two fingers can operate both controls at once.
- WebGL is the default. Optional WebGPU falls back to WebGL if adapter creation or initialization fails. FPS and frame duration are sampled from the running render loop.
- Position and camera angle autosave to `hollow-harvest:foundation:v1`; collected embers use `hollow-harvest:progress:v1`. Renderer preference uses `hollow-harvest:renderer`. These separate keys never touch Bubble Nightmare.

From the workspace root, install with `pnpm install --frozen-lockfile`, then:

```sh
pnpm --filter @workspace/hollow-harvest run typecheck
pnpm --filter @workspace/hollow-harvest run dev
pnpm --filter @workspace/hollow-harvest run build
pnpm --filter @workspace/hollow-harvest run serve
```

The static output is `artifacts/hollow-harvest/dist/public`. The default build uses relative asset URLs; Replit supplies the `/hollow-harvest/` base path for its preview and build. Serve the output over HTTP(S), not `file://`. No API server is required. This is not an APK project.
