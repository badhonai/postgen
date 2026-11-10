# fluton-notes-tree

A 9:16, 28 s explainer for Fluton's note model, built solo (the Acepyr flow): voice first, then
the picture bends to it. Delivered as a draft post in PostGen.

- Voice: Liam (`TX3LPaxmHKxFdv7VOQHJ`), 26.93 s — `production/narration.mp3`
- Master: `renders/fluton-notes-tree/fluton-notes-tree-final.mp4` (−14.29 LUFS / −1.99 dBTP)
- Delivery notes and the scene map: `production/DELIVERY.md`
- Claims and their sources: `production/FACT-CHECK.md`

Rebuild:

```bash
cd studio
npm run still -- fluton-notes-tree --frame=200        # look at a frame
npm run render -- fluton-notes-tree
python3 tools/score.py --cues projects/fluton-notes-tree/production/cues.json \
  --out projects/fluton-notes-tree/production/score.wav
python3 tools/mix_audio.py --narration projects/fluton-notes-tree/production/narration.mp3 \
  --score projects/fluton-notes-tree/production/score.wav \
  --out projects/fluton-notes-tree/production/mix.wav --duration 28.13
python3 tools/master-audio.py --picture renders/fluton-notes-tree/fluton-notes-tree.mp4 \
  --mix projects/fluton-notes-tree/production/mix.wav \
  --output renders/fluton-notes-tree/fluton-notes-tree-final.mp4 --true-peak=-2.0
```
