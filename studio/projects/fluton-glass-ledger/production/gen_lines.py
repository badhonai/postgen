#!/usr/bin/env python3
"""Turn the provider's character alignment into word-timed lines for the picture.

The film time of a spoken word is (audio time + LEAD). LEAD is the same 0.6 s the timeline
was aligned with, so a word, its on-screen reveal and the score's downbeat share one clock.
Chapter bounds sit in the *gaps between sentences*, never inside one.
"""
import json, re
from pathlib import Path

LEAD = 0.6
FPS = 30
here = Path(__file__).parent
al = json.loads((here / 'narration.alignment.json').read_text())['alignment']
chars = al['characters']; st = al['character_start_times_seconds']; en = al['character_end_times_seconds']

words = []
i = 0
while i < len(chars):
    if chars[i].isspace():
        i += 1
        continue
    j = i
    while j < len(chars) and not chars[j].isspace():
        j += 1
    words.append({'w': ''.join(chars[i:j]), 's': st[i], 'e': en[j - 1]})
    i = j

# sentences
sents, cur = [], []
for w in words:
    cur.append(w)
    if w['w'][-1] in '.!?' and not re.match(r'^[0-9]', w['w']):
        sents.append(cur); cur = []
if cur:
    sents.append(cur)

for s in sents:
    s[0]['sentenceStart'] = s[0]['s']
    s[-1]['sentenceEnd'] = s[-1]['e']

# chapter plan: which sentences belong to which chapter, in order
plan = [
    ('ledger', [0, 1]),
    ('note', [2, 3]),
    ('tree', [4]),
    ('joinsplit', [5]),
    ('nullifier', [6]),
    ('extdata', [7]),
    ('boundary', [8]),
    ('close', [9, 10]),
]
flat = [s for grp in plan for s in grp[1]]
assert len(flat) == len(sents), (len(flat), len(sents))

def f(t):
    return int(round((t + LEAD) * FPS))

scenes = []
prev_end = 0.0
for name, idxs in plan:
    group = [sents[i] for i in idxs]
    start_audio = group[0][0]['s'] - LEAD if scenes else -LEAD
    end_audio = group[-1][-1]['e'] - LEAD
    scenes.append({
        'id': name,
        'startFrame': max(0, f(start_audio)),
        'endAudioFrame': f(end_audio),
        'sentences': [{
            'text': ' '.join(w['w'] for w in s),
            'startFrame': f(s[0]['s'] - LEAD),
            'endFrame': f(s[-1]['e'] - LEAD),
            'words': [{'w': w['w'], 'startFrame': f(w['s'] - LEAD), 'endFrame': f(w['e'] - LEAD)} for w in s],
        } for s in group],
    })

# a chapter ends in the middle of the gap before the next sentence
for k in range(len(scenes) - 1):
    end = scenes[k]['endAudioFrame']; nxt = scenes[k + 1]['startFrame']
    scenes[k]['endFrame'] = int(round((end + nxt) / 2))
scenes[-1]['endFrame'] = int(round((scenes[-1]['endAudioFrame'] + LEAD * FPS + 26) / 10) * 10)

total = scenes[-1]['endFrame']
out = {'leadSeconds': LEAD, 'fps': FPS, 'durationInFrames': total,
       'durationSeconds': round(total / FPS, 3), 'scenes': scenes}
(here.parent / 'src' / 'lines.json').write_text(json.dumps(out, indent=1))

for s in scenes:
    print(f"{s['id']:10s} {s['startFrame']:5d}-{s['endFrame']:5d}  "
          f"{(s['endFrame']-s['startFrame'])/FPS:5.2f}s  " + ' | '.join(x['text'][:44] for x in s['sentences']))
print('total', total, total / FPS)
