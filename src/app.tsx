import { useState } from 'preact/hooks'
import type { IpcEnvelope, PingResponse } from './shared/ipc'

export function App() {
  const [result, setResult] = useState<IpcEnvelope<PingResponse> | null>(null)
  const [loading, setLoading] = useState(false)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const apiAvailable = Boolean(window.tramaApi?.ping)

  async function runPing(): Promise<void> {
    setLoading(true)
    setRuntimeError(null)

    try {
      if (!window.tramaApi?.ping) {
        throw new Error('Preload API no disponible (window.tramaApi.ping)')
      }

      const response = await window.tramaApi.ping({ message: 'phase-1-ready' })
      setResult(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido en IPC'
      setRuntimeError(message)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <div class="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-10">
        <p class="text-xs uppercase tracking-[0.2em] text-emerald-300">Trama - Phase 1</p>
        <h1 class="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Electron + Preact Shell</h1>
        <p class="mt-4 max-w-2xl text-slate-300">
          Base segura con context isolation habilitado, API expuesta por preload y contrato IPC tipado.
        </p>
        <p class="mt-2 text-sm text-slate-400">
          Estado preload API: {apiAvailable ? 'disponible' : 'no disponible'}
        </p>

        <section class="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/40">
          <button
            type="button"
            onClick={runPing}
            disabled={loading}
            class="rounded-lg bg-emerald-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
          >
            {loading ? 'Ejecutando IPC...' : 'Probar round-trip IPC'}
          </button>

          <div class="mt-5 rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-sm text-slate-200">
            {!result && 'Sin ejecutar'}
            {result && result.ok && (
              <pre>{JSON.stringify(result.data, null, 2)}</pre>
            )}
            {result && !result.ok && (
              <pre>{JSON.stringify(result.error, null, 2)}</pre>
            )}
            {runtimeError && <pre>{JSON.stringify({ runtimeError }, null, 2)}</pre>}
          </div>
        </section>

        <div class="mt-8 text-sm text-slate-400">
          <p>DoD Phase 1: arranque + shell UI + llamada IPC de renderer a main y vuelta.</p>
        </div>
      </div>
    </main>
  )
}
