#!/usr/bin/env python3
"""Derive a default cue sheet from the picture's own timings.

    python3 tools/cues-from-lines.py <slug> [--bpm=120] [--fps=30]

Reads src/lines.json (word timings) and writes production/cues.json: one section per chapter, with
the feel chosen from its length, a latin-note chord set per section, and an accent on every chapter
cut and every sentence start, plus a latch on the hot words. The score is then rebuilt with
`node tools/film.mjs score <slug>`. Edit cues.json by hand afterwards if a chapter needs a
specific mood; this only removes the guesswork of writing the file from scratch.
"""
import argparse, json
from pathlib import Path

# Chord sets in four moods. Kept as plain triads so score.py's note parser can read them.
MOODS = {
    'sparse':  [['A2', 'E3', 'A3'], ['F2', 'A2', 'C3']],
    'steady':  [['F2', 'A2', 'C3'], ['C3', 'E3', 'G3']],
    'half':    [['C3', 'G3'], ['G2', 'D3']],
    'driving': [['D3', 'F3', 'A3'], ['A2', 'C3', 'E3']],
}
ROOTS = {'sparse': 'A1', 'steady': 'F1', 'half': 'C2', 'driving': 'D2'}
ARPS = {'sparse': ['A3', 'E4', 'C4'], 'steady': ['F4', 'A4', 'C5'],
        'half': ['C4', 'G4'], 'driving': ['D4', 'A4', 'F4']}

# words that get a hard transient
HOT = {'nothing', 'never', 'real?', 'proof.', 'encrypted.', 'payment.', 'gas.', 'balances:',
       'crossing.', 'created,', 'revealed.', 'two', 'nullifier,', 'hash,'}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('slug')
    ap.add_argument('--bpm', type=float, default=120)
    ap.add_argument('--fps', type=int, default=30)
    a = ap.parse_args()
    root = Path(__file__).resolve().parent.parent
    pdir = root / 'projects' / a.slug
    lines = json.loads((pdir / 'src/lines.json').read_text())
    fps = lines.get('fps', a.fps)

    sections, accents = [], []
    for sc in lines['scenes']:
        dur = (sc['endFrame'] - sc['startFrame']) / fps
        if dur < 4:
            feel = 'half'
        elif dur < 6:
            feel = 'steady'
        elif dur < 9:
            feel = 'driving'
        else:
            feel = 'steady'
        sections.append({
            'name': sc['id'],
            'start': round(sc['startFrame'] / fps, 3),
            'end': round(sc['endFrame'] / fps, 3),
            'feel': feel,
            'chords': MOODS[feel],
            'root': ROOTS[feel],
            'arp': ARPS[feel],
            'padAmp': 0.19 if feel == 'sparse' else 0.15,
        })
        accents.append({'time': round(sc['startFrame'] / fps, 3), 'kind': 'impact'})
        for si, sn in enumerate(sc['sentences']):
            if si:
                accents.append({'time': round(sn['startFrame'] / fps, 3), 'kind': 'click'})
            for w in sn['words']:
                if w['w'].lower() in HOT:
                    accents.append({'time': round(w['startFrame'] / fps, 3), 'kind': 'latch'})

    seen, unique = set(), []
    for acc in sorted(accents, key=lambda x: (x['time'], x['kind'])):
        key = (round(acc['time'], 2), acc['kind'])
        if key not in seen:
            seen.add(key)
            unique.append(acc)

    out = {'fps': fps, 'durationSeconds': lines['durationSeconds'], 'bpm': a.bpm,
           'sections': sections, 'accents': unique}
    (pdir / 'production/cues.json').write_text(json.dumps(out, indent=1))
    print(f"wrote production/cues.json: {len(sections)} sections, {len(unique)} accents, {a.bpm} bpm")


if __name__ == '__main__':
    main()
