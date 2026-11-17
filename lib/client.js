// Bibibobo speech — client half.
//
// Design note: this plugin never replaces a host renderer and never reads
// another plugin's DOM. It registers one control in the composer tool row, and reads
// the transcript through `useChat`, the standard selector hook every
// Session-scoped slot receives as a prop. Audio is produced by the inlined
// bibibobo synth (MIT, hakihakii/bibibobo).
window.__ModuleLoader__.load({
  id: 'dsh-bibibobo',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /* ───────────────────────── inlined bibibobo (MIT) ───────────────────────── */

    const TAU = Math.PI * 2
    const mtof = (m) => 440 * 2 ** ((m - 69) / 12)

    /** Five mouth shapes: each is just two formant frequencies in Hz. */
    const VOWELS = [[800, 1200], [400, 2200], [350, 800], [600, 1700], [300, 2600]]

    /** Voices: scale in MIDI, formant multiplier, per-syllable cap, attack chirp, default speed. */
    const VOICES = {
      fish: {scale: [76, 79, 81, 83, 84], formant: 1.25, maxDur: 0.13, hold: 0.8, chirp: 1.5, fall: 0, gain: 0.16, step: 0.13},
      lumo: {scale: [62, 64, 67, 69], formant: 0.9, maxDur: 0.2, hold: 0.7, chirp: 0, fall: -2, gain: 0.17, step: 0.16},
    }

    /** The same character always hashes to the same number, so it always sounds the same. */
    const hash = (s) => [...s].reduce((acc, c) => (acc * 31 + c.codePointAt(0)) % 9973, 7)

    /** One Han character is one syllable; a run of latin/digits is one syllable. */
    const syllables = (s) => s.match(/[A-Za-z_/.0-9]+|[\u4e00-\u9fff]/g) ?? []

    // Anti-aliased sawtooth (polyBLEP).
    function saw(sampleRate) {
      let ph = 0
      return (f) => {
        const dt = f / sampleRate
        ph += dt; if (ph >= 1) ph -= 1
        let v = 2 * ph - 1
        if (ph < dt) { const t = ph / dt; v -= t + t - t * t - 1 }
        else if (ph > 1 - dt) { const t = (ph - 1) / dt; v -= t * t + t + t + 1 }
        return v
      }
    }
    // State-variable filter, band-pass output.
    function bandpass(sampleRate) {
      let lp = 0, bp = 0
      return (x, fc, q) => {
        const f = 2 * Math.sin((Math.PI * Math.min(fc, sampleRate / 6)) / sampleRate)
        const hp = x - lp - bp / q
        bp += f * hp; lp += f * bp
        return bp
      }
    }

    /** Write one syllable into `out`: pitch `m`, `dur` seconds, `glide` semitones, `vowel` picks the mouth. */
    function voice(out, sampleRate, t, m, dur, v, glide = 0, vowel = 0) {
      const osc = saw(sampleRate), f1 = bandpass(sampleRate), f2 = bandpass(sampleRate)
      const [a, b] = VOWELS[vowel % VOWELS.length]
      const start = Math.floor(t * sampleRate), n = Math.floor(dur * sampleRate)
      for (let i = 0; i < n && start + i < out.length; i++) {
        const x = i / sampleRate
        const pitch = mtof(m + glide * (x / dur) + v.chirp * Math.exp(-x * 30)) * (1 + 0.012 * Math.sin(TAU * 6 * x))
        const s = osc(pitch)
        const env = Math.min(1, x * 200) * Math.min(1, (dur - x) * 40)
        out[start + i] += (f1(s, a * v.formant, 4) + 0.7 * f2(s, b * v.formant, 5)) * env * v.gain
      }
    }

    /** Synthesize one line of text into mono Float32 samples. */
    function synth(text, opts = {}) {
      const v = typeof opts.voice === 'object' ? {...VOICES.fish, ...opts.voice} : VOICES[opts.voice ?? 'fish']
      const sampleRate = opts.sampleRate ?? 44100, step = opts.step ?? v.step, gap = opts.gap ?? 0.22
      const sentences = (text.match(/[^？?！!。.，,、；;…\n]+[？?！!。.，,、；;…]*/g) ?? [])
        .map((s) => ({text: s, tk: syllables(s)}))
        .filter((s) => s.tk.length)
      const total = sentences.reduce((n, s) => n + s.tk.length * step + gap, 0) + 0.4
      const out = new Float32Array(Math.ceil(total * sampleRate))
      let t = 0.02
      for (const {text: s, tk} of sentences) {
        const ask = /[？?]$/.test(s), shout = /[！!]/.test(s), sad = /(……|\.\.\.|…)$/.test(s)
        tk.forEach((w, i) => {
          const last = i === tk.length - 1
          const m = v.scale[hash(w) % v.scale.length] + (shout ? 3 : 0) - (sad ? 3 : 0)
          const dur = Math.min(step * v.hold, v.maxDur) + (last && (ask || shout || sad) ? 0.1 : 0)
          voice(out, sampleRate, t + i * step, m, dur, v,
            last && ask ? 5 : last && sad ? -4 : last ? v.fall : 0, hash(w))
        })
        t += tk.length * step + gap
      }
      for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * 2.4)
      return out
    }

    /** Pack samples into 16-bit mono WAV bytes. */
    function toWav(samples, sampleRate = 44100) {
      const buf = new ArrayBuffer(44 + samples.length * 2), d = new DataView(buf)
      const str = (o, s) => [...s].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)))
      str(0, 'RIFF'); d.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVEfmt ')
      d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true)
      d.setUint32(24, sampleRate, true); d.setUint32(28, sampleRate * 2, true)
      d.setUint16(32, 2, true); d.setUint16(34, 16, true)
      str(36, 'data'); d.setUint32(40, samples.length * 2, true)
      for (let i = 0; i < samples.length; i++) {
        d.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), true)
      }
      return new Uint8Array(buf)
    }

    /* ───────────────────────── reply text ───────────────────────── */

    const MAX_CHARS = 1200

    /** Strip Markdown that babble would only turn into unlistenable runs. */
    function speakable(markdown) {
      let text = String(markdown == null ? '' : markdown)
      text = text.replace(/```[\s\S]*?(?:```|$)/g, ' ')
      text = text.replace(/`[^`\n]*`/g, ' ')
      text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '')
      text = text.replace(/^\s{0,3}>\s?/gm, '')
      text = text.replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, '')
      text = text.replace(/[*_~]{1,3}/g, '')
      text = text.replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, ' ')
      text = text.replace(/\s+/g, ' ').trim()
      return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text
    }

    /** Settled plain text of one `assistant-step` Chat node, or null. */
    function nodeText(node) {
      if (!node || node.kind !== 'assistant-step') return null
      const data = node.data
      if (!data || data.status !== 'settled') return null
      const blocks = data.blocks || []
      const parts = []
      for (const block of blocks) {
        if (block && block.kind === 'text' && block.text) parts.push(block.text)
      }
      return parts.length ? parts.join('\n\n') : null
    }

    /* ───────────────────────── playback ───────────────────────── */

    // One audio element per page. A new utterance stops the previous one, so
    // speech never stacks; `playToken` discards late rejections from a
    // superseded utterance (the same class of bug bibibobo fixed for iOS).
    const player = typeof Audio === 'undefined' ? null : new Audio()
    let playToken = 0
    let objectUrl = null
    let state = 'idle'
    let spokenKey = null
    const listeners = new Set()
    const settings = {voice: 'fish'}

    function emit() { listeners.forEach((fn) => fn()) }

    function setState(next) {
      if (state === next) return
      state = next
      emit()
    }

    /** Cancel playback and allow the current reply to be replayed. */
    function stop() {
      playToken += 1
      spokenKey = null
      if (player) { try { player.pause() } catch { /* already detached */ } }
      setState('idle')
    }

    /** Speak `text`; `key` marks the source node so the same reply is not repeated. */
    function speak(text, key) {
      if (!player) return
      const body = speakable(text)
      if (!body) return
      stop()
      spokenKey = key || null
      const token = playToken
      const previous = objectUrl
      objectUrl = URL.createObjectURL(new Blob([toWav(synth(body, {voice: settings.voice}))], {type: 'audio/wav'}))
      player.src = objectUrl
      // Release the previous utterance's URL only after the new source attaches.
      if (previous) URL.revokeObjectURL(previous)
      setState('playing')
      let settling
      try { settling = player.play() } catch { setState('idle'); return }
      if (settling && typeof settling.then === 'function') {
        settling.then(
          () => { if (token === playToken && state === 'playing') setState(player.paused ? 'paused' : 'playing') },
          (error) => {
            // A superseded utterance rejects with AbortError; anything else is real.
            if (token !== playToken || (error && error.name === 'AbortError')) return
            setState('idle')
          },
        )
      }
    }

    function toggle() {
      if (!player) return
      if (state === 'playing') {
        try { player.pause() } catch { /* already detached */ }
        setState('paused')
        return
      }
      if (state !== 'paused') return
      const token = playToken
      setState('playing')
      let settling
      try { settling = player.play() } catch { setState('idle'); return }
      if (settling && typeof settling.then === 'function') {
        settling.catch(() => { if (token === playToken) setState('idle') })
      }
    }

    // Playback finishing must return the control to idle; without this the
    // button would stay on ⏸ after the audio ran out.
    function onEnded() {
      if (state === 'idle') return
      setState('idle')
    }

    /**
     * Flatten text into one readable subtitle line, capped to a sane length.
     *
     * The window is centered on the character being spoken so the audible part
     * stays visible instead of scrolling off the left edge.
     */
    function subtitleLine(text, at) {
      const clean = String(text || '').replace(/\s+/g, ' ').trim()
      if (!clean) return ''
      const LIMIT = 60
      if (clean.length <= LIMIT) return clean
      const half = Math.floor(LIMIT / 2)
      const from = Math.max(0, Math.min(clean.length - LIMIT, at - half))
      return (from > 0 ? '…' : '') + clean.slice(from, from + LIMIT) + (from + LIMIT < clean.length ? '…' : '')
    }

    /* ───────────────────────── message action row ───────────────────────── */

    // Inline styles keep the entry self-contained: unmounting removes the markup
    // and leaves no stylesheet behind. Colours come from host theme tokens.
    // Compact icon-size buttons: this sits in the composer tool row beside the
    // other controls, so it must not impose its own height or padding rhythm.
    const BUTTON = {
      font: 'inherit', fontSize: '1em', lineHeight: 1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '0.3em', borderRadius: '0.4em', cursor: 'pointer',
      border: 'none', background: 'transparent',
      color: 'var(--dsw-alias-text-secondary, inherit)',
    }

    /**
     * Return this entry's spoken text when `messageId` is a turn's final reply.
     *
     * "Final reply" follows the host's own definition: `turn-tail` closes each
     * turn with `closing = finalized.findLast(hasText)` — the last assistant
     * node in that turn that actually has text. DSH gates "branch in a new
     * conversation" on the same fact, so this matches how the host itself
     * identifies a turn's answer.
     *
     * Every closed turn gets its own control, including history: the button
     * under a past answer reads that turn's closing text, not the middle of a
     * multi-step answer. Intermediate steps return null and render nothing.
     *
     * The selector returns a primitive so a fresh object identity cannot make
     * React re-render without end.
     */
    function useFinalReplyText(useChat, messageId) {
      const hit = useChat((chat) => {
        const turns = chat.timeline && chat.timeline.turns
        if (!turns || typeof turns.values !== 'function') return null

        // Any closed turn whose closing answer is this message.
        for (const location of turns.values()) {
          if (!location || location.status !== 'closed') continue
          const tail = location.data && location.data.get('turn-tail')
          if (!tail || !tail.closing) continue
          if (tail.closing.finalNode.messageId !== messageId) continue

          for (const node of chat.nodes.values()) {
            if (node && node.kind === 'assistant-step' && node.data
              && node.data.finalNode
              && node.data.finalNode.messageId === messageId) {
              const text = nodeText(node)
              if (text) return text
            }
          }
        }
        return null
      })
      return hit
    }

    function SpeakControl(props) {
      const text = useFinalReplyText(props.useChat, props.messageId)
      const [live, setLive] = React.useState(state)
      // Position is polled while playing only; `timeupdate` fires ~4x/s, which is
      // enough for a subtitle and a progress bar without busy-rendering.
      const [position, setPosition] = React.useState({at: 0, total: 0})
      React.useEffect(() => {
        const fn = () => setLive(state)
        listeners.add(fn)
        return () => { listeners.delete(fn) }
      }, [])
      React.useEffect(() => {
        if (!player) return undefined
        player.addEventListener('ended', onEnded)
        return () => { player.removeEventListener('ended', onEnded) }
      }, [])
      React.useEffect(() => {
        if (!player) return undefined
        if (live === 'idle') { setPosition({at: 0, total: 0}); return undefined }
        const sync = () => setPosition({
          at: player.currentTime || 0,
          total: Number.isFinite(player.duration) ? player.duration : 0,
        })
        sync()
        player.addEventListener('timeupdate', sync)
        player.addEventListener('loadedmetadata', sync)
        return () => {
          player.removeEventListener('timeupdate', sync)
          player.removeEventListener('loadedmetadata', sync)
        }
      }, [live])
      if (!text) return null

      const label = live === 'playing' ? '⏸' : live === 'paused' ? '▶' : '🔊'
      const title = live === 'playing' ? '暂停朗读' : live === 'paused' ? '继续朗读' : '用哔哔啵啵读出来'
      const audible = speakable(text)
      const ratio = position.total > 0 ? Math.min(1, position.at / position.total) : 0
      // Subtitle follows the fraction of audio played, mapped onto the spoken text.
      const cursor = audible.length > 0 ? Math.min(audible.length - 1, Math.floor(ratio * audible.length)) : 0
      const line = live === 'idle' ? '' : subtitleLine(audible, cursor)

      return h('div', {
        style: {
          display: 'inline-flex', alignItems: 'center', gap: '0.45em',
          minWidth: 0, maxWidth: '38em',
        },
      },
        h('button', {
          type: 'button', style: BUTTON, title, 'aria-label': title,
          onClick: () => { if (live === 'idle') speak(text, props.messageId); else toggle() },
        }, label),
        live === 'idle' ? null : h('button', {
          type: 'button', style: BUTTON, title: '结束朗读', 'aria-label': '结束朗读',
          onClick: stop,
        }, '⏹'),
        live === 'idle' ? null : h('div', {
          style: {display: 'flex', alignItems: 'center', gap: '0.45em', minWidth: 0, flex: '0 1 auto'},
        },
          // Progress bar rides the same row as the action buttons: a fixed
          // 6em track is wide enough to read at a glance without pushing the
          // host's own actions out of the row.
          h('div', {
            role: 'progressbar',
            'aria-valuemin': 0, 'aria-valuemax': 100,
            'aria-valuenow': Math.round(ratio * 100),
            title: `${Math.round(ratio * 100)}%`,
            style: {
              flex: '0 0 6em', width: '6em', height: '0.25em', borderRadius: '0.125em',
              background: 'var(--dsw-alias-border-subtle, rgba(0,0,0,0.13))',
              overflow: 'hidden',
            },
          }, h('div', {
            style: {
              width: `${ratio * 100}%`, height: '100%',
              background: 'var(--dsw-alias-text-secondary, #666)',
              transition: 'width 200ms linear',
            },
          })),
          h('span', {
            style: {
              fontSize: '0.85em', whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: 'ellipsis', maxWidth: '24em',
              color: 'var(--dsw-alias-text-secondary, #666)',
            },
          }, line),
        ),
      )
    }

    /* ───────────────────────── plugin surface ───────────────────────── */

    return {
      inject: ['slots'],
      apply(ctx) {
        // One entry per finalized assistant message, sitting in the host's own
        // action row beside Copy / Good / Bad / Branch.
        ctx.slots.inject('conversation.chat.assistant-actions', () => ctx.slots.register({
          name: 'conversation.chat.assistant-actions',
          id: 'dsh-bibibobo',
          order: 20,
        }, SpeakControl))
      },
    }
  },
})
