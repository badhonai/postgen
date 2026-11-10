#!/usr/bin/env python3
"""Word-level timing for a film, from the voice provider's character alignment.

    python3 tools/word-lines.py <slug> [--lead=0.6]

Reads   production/narration.alignment.json   (characters + per-character start/end seconds)
        production/scenes.json                (chapter order and which sentences belong to each)
Writes  src/lines.json                        (every word with its start/end frame)
        src/film-data.json                    (scene bounds, duration — the picture's clock)
        project.json                          (durationInFrames)

Why: sentence-level splitting puts a cut in the middle of a sentence and lets a fact appear
seconds away from the words that explain it. Word-level timing means a scene can key any element
to the exact frame its own word is spoken, and chapter bounds always fall in a sentence gap.

The lead: the provider starts speaking at t=0, but a film needs air before the first word. LEAD is
applied here so the same number is baked into `narration-lead.wav` (see the pipeline doc).
"""
import argparse, json, re, subprocess
from pathlib import Path

STEP = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def words_from_alignment(al):
    chars = al['characters']
    st = al['character_start_times_seconds']
    en = al['character_end_times_seconds']
    out, i = [], 0
    while i < len(chars):
        if chars[i].isspace():
            i += 1
            continue
        j = i
        while j < len(chars) and not chars[j].isspace():
            j += 1
        out.append({'w': ''.join(chars[i:j]), 's': float(st[i]), 'e': float(en[j - 1])})
        i = j
    return out


def estimate_alignment(script, wps):
    """Synthesize a character alignment from the script at a constant speaking rate."""
    words = script.split()
    chars, starts, ends = [], [], []
    t = 0.0
    pause = 0.0
    for w in words:
        if pause:
            t += pause
            pause = 0.0
        per_char = 1.0 / (wps * 3.4)   # ~3.4 characters per spoken word at this rate
        for ch in w:
            chars.append(ch)
            starts.append(round(t, 4))
            t += per_char
            ends.append(round(t, 4))
        chars.append(' ')
        starts.append(round(t, 4))
        ends.append(round(t, 4))
        if w.endswith(('.', '!', '?')):
            pause = 0.35
        elif w.endswith((',', ':', ';')):
            pause = 0.18
        else:
            pause = 0.03
    return {'characters': chars,
            'character_start_times_seconds': starts,
            'character_end_times_seconds': ends}


def sentences(words):
    sents, cur = [], []
    for w in words:
        cur.append(w)
        if w['w'][-1] in '.!?' and not re.match(r'^[0-9]', w['w']):
            sents.append(cur)
            cur = []
    if cur:
        sents.append(cur)
    return sents


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('slug')
    ap.add_argument('--lead', type=float, default=0.6)
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--estimate', type=float, default=0,
                    help='no voice yet: synthesize timings from voiceover.txt at this words/second')
    a = ap.parse_args()

    root = Path(__file__).resolve().parent.parent
    pdir = root / 'projects' / a.slug
    prod = pdir / 'production'
    plan = json.loads((prod / 'scenes.json').read_text())
    al_path = prod / 'narration.alignment.json'
    if al_path.exists() and not a.estimate:
        al = json.loads(al_path.read_text())['alignment']
    elif a.estimate:
        # Animatic mode: build a character-level alignment from the script at a fixed speaking
        # rate, so the picture, the score and the review stills can be built and judged while the
        # paid voice is still pending. Same shape as the provider's, same code path below.
        al = estimate_alignment((prod / 'voiceover.txt').read_text(), a.estimate)
        print(f'no alignment yet — estimated at {a.estimate} words/second (ANIMATIC timing)')
    else:
        raise SystemExit('Missing production/narration.alignment.json. '
                         'Generate the voice, or pass --estimate=<words per second> for an animatic.')
    spec = json.loads((pdir / 'src' / 'film-data.json').read_text())

    sents = sentences(words_from_alignment(al))
    fps, lead = a.fps, a.lead
    f = lambda t: int(round((t + lead) * fps))

    used = [i for s in plan['scenes'] for i in s['sentences']]
    if len(used) != len(sents) or used != sorted(used):
        raise SystemExit(f'scenes.json lists {len(used)} sentences in a non-sequential order; '
                         f'the narration has {len(sents)}. Fix production/scenes.json.')

    out_scenes, previous_end = [], 0
    for s in plan['scenes']:
        group = [sents[i] for i in s['sentences']]
        start = 0 if not out_scenes else max(previous_end, f(group[0][0]['s'] - lead) - 10)
        out_scenes.append({
            'id': s['id'],
            'startFrame': start,
            'endAudioFrame': f(group[-1][-1]['e'] - lead),
            'ground': s.get('ground'),
            'sentences': [{
                'text': ' '.join(w['w'] for w in g),
                'startFrame': f(g[0]['s'] - lead),
                'endFrame': f(g[-1]['e'] - lead),
                'words': [{'w': w['w'], 'startFrame': f(w['s'] - lead), 'endFrame': f(w['e'] - lead)} for w in g],
            } for g in group],
        })
        previous_end = out_scenes[-1]['startFrame']

    for k in range(len(out_scenes) - 1):
        end, nxt = out_scenes[k]['endAudioFrame'], out_scenes[k + 1]['startFrame']
        out_scenes[k]['endFrame'] = int(round((end + nxt) / 2))
    last = out_scenes[-1]
    last['endFrame'] = int(round((last['endAudioFrame'] + lead * fps + 26) / 10) * 10)
    total = last['endFrame']

    lines = {'leadSeconds': lead, 'fps': fps, 'durationInFrames': total,
             'durationSeconds': round(total / fps, 3),
             'scenes': [{k: v for k, v in s.items() if k != 'endAudioFrame'} for s in out_scenes]}
    (pdir / 'src' / 'lines.json').write_text(json.dumps(lines, indent=1))

    palette = spec['palette']
    spec['scenes'] = [{
        'id': s['id'],
        'startFrame': s['startFrame'],
        'endFrameExclusive': s['endFrame'],
        'ground': s.get('ground'),
        'background': palette['paper' if s.get('ground') == 'paper' else
                              'ink' if s.get('ground') == 'ink' else
                              'verm' if s.get('ground') == 'verm' else 'blue'],
        'foreground': palette['ink' if s.get('ground') == 'paper' else 'paper'],
        'captionText': ' '.join(x['text'] for x in s['sentences']),
    } for s in out_scenes]
    spec['durationInFrames'] = total
    spec['durationSeconds'] = round(total / fps, 3)
    (pdir / 'src' / 'film-data.json').write_text(json.dumps(spec, indent=2))

    pj = json.loads((pdir / 'project.json').read_text())
    pj['durationInFrames'] = total
    pj['fps'] = fps
    (pdir / 'project.json').write_text(json.dumps(pj, indent=2) + '\n')

    print(f'wrote src/lines.json + src/film-data.json: {total} frames / {total / fps:.2f}s')
    for s in out_scenes:
        print(f"  {s['id']:10s} {s['startFrame']:5d}-{s['endFrame']:5d} "
              f"{(s['endFrame'] - s['startFrame']) / fps:5.2f}s  {s['sentences'][0]['text'][:52]}")
    print(f'\nNext: build production/narration-lead.wav with a {lead}s lead, then render.')


if __name__ == '__main__':
    main()
