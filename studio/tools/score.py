#!/usr/bin/env python3
"""Deterministic original score + sound design for a project. No third-party music, samples or paid API.

Synthesis only: sine/triangle/noise primitives with short dry transients. Cue times are read from
the project's production/cues.json so picture changes and sound stay in step.
"""
import argparse, json, math, wave
from pathlib import Path
import numpy as np

SR = 48000

def env(n, a=0.004, d=0.2, shape=6.0):
    t = np.arange(n) / SR
    attack = np.clip(t / max(a, 1e-4), 0, 1)
    return attack * np.exp(-t * (shape / max(d, 1e-3)))

def tone(freq, dur, amp=0.2, kind='sine', detune=0.0, harm=0.0):
    n = int(dur * SR); t = np.arange(n) / SR
    ph = 2 * np.pi * freq * t
    if kind == 'sine':
        x = np.sin(ph)
    elif kind == 'tri':
        x = 2 * np.abs(2 * ((freq * t) % 1) - 1) - 1
    elif kind == 'saw':
        x = sum(np.sin(ph * k) / k for k in range(1, 7))
    else:
        x = np.sin(ph)
    if detune:
        x = 0.5 * x + 0.5 * np.sin(2 * np.pi * freq * (1 + detune) * t)
    if harm:
        x = x + harm * np.sin(2 * ph)
    return amp * x

def add(buf, start, sig, pan=0.0):
    i = int(start * SR)
    if i >= buf.shape[0]:
        return
    seg = sig[: buf.shape[0] - i]
    l = math.sqrt(0.5 * (1 - pan)); r = math.sqrt(0.5 * (1 + pan))
    buf[i:i + len(seg), 0] += seg * l
    buf[i:i + len(seg), 1] += seg * r

def kick(buf, start, amp=0.55):
    n = int(0.34 * SR); t = np.arange(n) / SR
    f = 118 * np.exp(-t * 22) + 43
    sig = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11) * amp
    add(buf, start, sig)

def click(buf, start, amp=0.18, freq=1700):
    n = int(0.07 * SR)
    sig = tone(freq, 0.07, amp, 'sine') * env(n, 0.0015, 0.02, shape=5)
    sig += tone(freq * 1.5, 0.07, amp * 0.3, 'sine') * env(n, 0.0015, 0.012, shape=5)
    add(buf, start, sig, pan=0.15)

def thump(buf, start, amp=0.5, freq=58, dur=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    f = freq * (1 + 0.6 * np.exp(-t * 26))
    sig = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * amp
    add(buf, start, sig)

def dry_hit(buf, start, amp=0.3, seed=1):
    n = int(0.11 * SR); t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    noise = rng.standard_normal(n)
    # one-pole lowpass: short, dry body rather than a hissing sweep
    alpha = 0.16
    lp = np.zeros(n); acc = 0.0
    for i, v in enumerate(noise):
        acc += alpha * (v - acc); lp[i] = acc
    sig = lp * np.exp(-t * 46) * amp
    add(buf, start, sig, pan=-0.1)
    add(buf, start, tone(190, 0.09, amp * 0.8, 'tri') * env(int(0.09 * SR), 0.001, 0.05, 8))

def pluck(buf, start, freq, amp=0.09, pan=-0.25):
    n = int(0.26 * SR)
    sig = tone(freq, 0.26, amp, 'tri') * env(n, 0.002, 0.16, shape=5.5)
    sig += tone(freq * 2, 0.26, amp * 0.25, 'sine') * env(n, 0.002, 0.07)
    add(buf, start, sig, pan=pan)

def pad(buf, start, dur, freqs, amp=0.055, cut=None):
    n = int(dur * SR); t = np.arange(n) / SR
    sig = np.zeros(n)
    for f in freqs:
        # warm additive stack: fundamental + a few decaying harmonics, slightly detuned pair
        for k, w in ((1, 1.0), (2, 0.42), (3, 0.22), (4, 0.1), (5, 0.05)):
            sig += w * (np.sin(2 * np.pi * f * k * t) + np.sin(2 * np.pi * f * k * 1.003 * t)) * 0.5
    sig /= len(freqs) * 1.79
    # soft attack/release, no zipper
    a = np.clip(t / 0.35, 0, 1); r = np.clip((dur - t) / 0.6, 0, 1)
    sig *= a * r * amp
    add(buf, start, sig, pan=0.0)

# Note names are parsed rather than tabulated, so any chord in cues.json is playable
# (the old fixed dictionary silently limited the score to six keys).
_STEP = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}

def freq(name: str) -> float:
    name = name.strip()
    letter = name[0].upper()
    rest = name[1:]
    semis = _STEP[letter]
    while rest and rest[0] in '#b':
        semis += 1 if rest[0] == '#' else -1
        rest = rest[1:]
    octave = int(rest)
    midi = 12 * (octave + 1) + semis
    return 440.0 * 2 ** ((midi - 69) / 12)

class _Notes(dict):
    """Lazy note-name → frequency map (keeps `NOTE['A1']` call sites working)."""
    def __missing__(self, key):
        return freq(key)

NOTE = _Notes()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cues', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    a = ap.parse_args()
    cues = json.loads(a.cues.read_text())
    dur = float(cues['durationSeconds']); bpm = float(cues.get('bpm', 120))
    beat = 60.0 / bpm; bar = beat * 4
    n = int(round(dur * SR))
    buf = np.zeros((n, 2))

    sections = cues['sections']
    for s in sections:
        t0, t1 = float(s['start']), float(s['end']); feel = s['feel']
        if 'chords' in s:
            b = t0
            while b < t1 - 0.01:
                pad(buf, b, min(bar * 1.02, t1 - b), [NOTE[x] for x in s['chords'][int(((b - t0) / bar)) % len(s['chords'])]], amp=s.get('padAmp', 0.16)*1.0)
                b += bar
        step = {'sparse': beat * 2, 'steady': beat, 'driving': beat / 2, 'half': beat * 2, 'none': None}[feel]
        if step:
            t = t0
            k = 0
            while t < t1 - 1e-6:
                if k % 4 == 0:
                    kick(buf, t, 0.42 if feel != 'sparse' else 0.28)
                if feel in ('driving', 'steady') and k % 4 == 2:
                    dry_hit(buf, t, 0.12, seed=int(t * 1000) % 97 + 1)
                root = NOTE[s.get('root', 'A1')]
                bdur = min(step * 0.92, t1 - t)
                if bdur > 0.05:
                    bn = int(bdur * SR); bt = np.arange(bn) / SR
                    bsig = (np.sin(2 * np.pi * root * bt) + 0.28 * np.sin(4 * np.pi * root * bt)) * np.clip(bt / 0.012, 0, 1) * np.clip((bdur - bt) / 0.09, 0, 1)
                    add(buf, t, bsig * (0.2 if feel != 'sparse' else 0.14))
                if 'arp' in s:
                    seq = s['arp']
                    pluck(buf, t, NOTE[seq[k % len(seq)]], amp=0.11 if feel == 'driving' else 0.085, pan=-0.3 if k % 2 else 0.3)
                t += step; k += 1
    for c in cues.get('accents', []):
        kind = c.get('kind', 'click'); t = float(c['time'])
        if kind == 'impact':
            thump(buf, t, 0.5, freq=52, dur=0.7); dry_hit(buf, t, 0.2, seed=7)
        elif kind == 'dry':
            dry_hit(buf, t, 0.24, seed=int(t * 77) % 89 + 3)
        elif kind == 'latch':
            click(buf, t, 0.3, 3300); click(buf, t + 0.035, 0.2, 2100)
        elif kind == 'rise':
            pass
        else:
            click(buf, t, 0.2, 2600)
    # master shape: gentle fade in/out, soft clip safety
    t = np.arange(n) / SR
    buf *= np.clip(t / 0.12, 0, 1)[:, None] * np.clip((dur - 0.06 - t) / 0.5, 0, 1)[:, None]
    peak = np.max(np.abs(buf)) or 1.0
    buf = np.tanh(buf / peak * 1.15) * 0.82
    a.out.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(a.out), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(buf, -1, 1) * 32767).astype('<i2').tobytes())
    print(f'wrote {a.out} {dur}s stereo 48k, peak {float(np.max(np.abs(buf))):.2f}')

if __name__ == '__main__':
    main()
