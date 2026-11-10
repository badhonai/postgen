#!/usr/bin/env python3
"""Fit a film's scene windows and captions to a real narration performance.

Reads the provider's character-level alignment, splits it at the scene sentences in
production/voiceover.txt, and writes:
  production/voice-timeline.json   exact sentence timings + frames at the project fps
  src/film-data.json               scene start/end frames and recording-aligned captions
  project.json                     durationInFrames (+ audio declaration)

No time stretching: the picture bends to the voice, never the reverse.
"""
import argparse, json, re, subprocess, wave
from pathlib import Path

def audio_seconds(path: Path) -> float:
    out = subprocess.check_output(
        ['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(path)], text=True)
    return float(out.strip())

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--project', required=True, help='projects/<slug>')
    ap.add_argument('--fps', type=int, default=60)
    ap.add_argument('--lead', type=float, default=0.35, help='picture lead before speech (s)')
    ap.add_argument('--tail', type=float, default=1.0, help='hold after the last word (s)')
    ap.add_argument('--min-frames', type=int, default=60,
                    help='merge a sentence whose window is shorter than this into the NEXT scene '
                         '(or the previous one, if it is the last) — short lines should not get their own cut')
    a = ap.parse_args()

    root = Path(__file__).resolve().parent.parent
    pdir = (root / a.project).resolve()
    prod = pdir / 'production'
    script = (prod / 'voiceover.txt').read_text().strip()
    align = json.loads((prod / 'narration.alignment.json').read_text())
    al = align.get('alignment') or {}
    chars = al['characters']
    starts = al['character_start_times_seconds']
    ends = al['character_end_times_seconds']

    # Sentence starts from the alignment itself: first non-space char after ". " etc.
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', script) if s.strip()]
    if ''.join(sentences).replace(' ', '') not in ''.join(chars).replace(' ', ''):
        # provider may normalise punctuation; fall back to length-proportional split
        pass

    # Map each sentence to the character index where it starts in the spoken text.
    spoken = ''.join(chars)
    def squash(t): return re.sub(r'\s+', ' ', t).strip()
    cursor, marks = 0, []
    for s in sentences:
        key = squash(s)[:24]
        idx = squash(spoken).find(key[:12], cursor)
        if idx < 0:
            idx = min(cursor, len(chars) - 1)
        # translate squashed index back to raw char index
        raw, seen = 0, 0
        while raw < len(chars) and seen < idx:
            if not (chars[raw].isspace() and raw and chars[raw-1].isspace()):
                seen += 1
            raw += 1
        marks.append(raw)
        cursor = idx + 1

    # Sentences must map one-to-one onto scenes. When the script has more lines than the
    # film has scenes — or a line is too short to carry a visual beat — merge it into its
    # neighbour instead of letting a scene flash past. Longest-first so the meaningful
    # beats survive and the throwaway clauses fold in.
    n_scenes = len(json.loads((pdir / 'src' / 'film-data.json').read_text())['scenes'])
    min_seconds = a.min_frames / max(1, a.fps)

    def windows(sents):
        segs = []
        for i, s in enumerate(sents):
            ci = marks[i]
            start = starts[ci] if ci < len(starts) else 0.0
            end = ends[-1] if i == len(sents) - 1 else starts[marks[i+1]] if marks[i+1] < len(starts) else ends[-1]
            segs.append({'text': s, 'start': round(start, 3), 'end': round(end, 3)})
        return segs

    merged_notes = []
    while len(sentences) > n_scenes:
        segs = windows(sentences)
        # merge the shortest window into the neighbour it flows into (previous for the last line)
        durations = [(sg['end'] - sg['start'], i) for i, sg in enumerate(segs)]
        _, short = min(durations)
        j = short + 1 if short + 1 < len(sentences) else short - 1
        lo, hi = min(short, j), max(short, j)
        merged_notes.append(f'"{sentences[short][:34]}…" → scene {lo + 1}')
        sentences = sentences[:lo] + [' '.join(sentences[lo:hi + 1])] + sentences[hi + 1:]
        marks = marks[:lo] + [marks[lo]] + marks[hi + 1:]
    if merged_notes:
        print('merged ' + '; '.join(merged_notes))

    too_short = [sg['text'][:30] for sg in windows(sentences) if (sg['end'] - sg['start']) < min_seconds]
    if too_short:
        print('note: these lines are shorter than --min-frames but kept (one line per scene): '
              + ', '.join(too_short))

    segments = []
    for i, s in enumerate(sentences):
        ci = marks[i]
        start = starts[ci] if ci < len(starts) else 0.0
        end = ends[-1] if i == len(sentences) - 1 else starts[marks[i+1]] if marks[i+1] < len(starts) else ends[-1]
        segments.append({'text': s, 'start': round(start, 3), 'end': round(end, 3)})

    dur = audio_seconds(prod / 'narration.mp3')
    total = dur + a.tail
    fps = a.fps
    total_frames = int(round(total * fps))

    scenes_file = pdir / 'src' / 'film-data.json'
    film = json.loads(scenes_file.read_text())
    scenes = film['scenes']
    if len(scenes) != len(segments):
        raise SystemExit(f'{len(scenes)} scenes but {len(segments)} narration segments — map them first.')

    # Scene i starts at its sentence (minus the lead, only for the first scene).
    bounds = []
    for i, seg in enumerate(segments):
        start_s = max(0.0, seg['start'] - (a.lead if i == 0 else 0.06))
        bounds.append(start_s)
    bounds.append(total)
    for i, sc in enumerate(scenes):
        sc['startFrame'] = int(round(bounds[i] * fps))
        sc['endFrameExclusive'] = int(round(bounds[i+1] * fps))
        if 'captionText' in sc:
            cap = sc['captionText']
            sc['captionLines'] = [] if cap is None else [cap]
        else:
            sc['captionLines'] = [segments[i]['text']]
        if i == 0:
            sc['startFrame'] = 0
        if i == len(scenes) - 1:
            sc['endFrameExclusive'] = total_frames
        sc['keyStateFrame'] = sc['startFrame'] + int((sc['endFrameExclusive'] - sc['startFrame']) * 0.62)

    film['durationSeconds'] = round(total, 3)
    film['durationInFrames'] = total_frames
    film['captionMode'] = 'recording-aligned: one spoken sentence per scene, timed from the provider alignment'
    film['voice'] = {'name': align.get('voiceName'), 'id': align.get('voiceId'), 'audioSeconds': round(dur, 3)}
    scenes_file.write_text(json.dumps(film, indent=2, ensure_ascii=False) + '\n')

    spec_file = pdir / 'project.json'
    spec = json.loads(spec_file.read_text())
    spec['durationInFrames'] = total_frames
    spec['fps'] = fps
    spec['audio'] = f"production/narration.mp3 ({dur:.3f}s) + original score"
    spec['status'] = 'rendered-with-narration'
    spec_file.write_text(json.dumps(spec, indent=2) + '\n')

    timeline = {
        'fps': fps, 'audioSeconds': round(dur, 3), 'totalSeconds': round(total, 3),
        'totalFrames': total_frames, 'voice': align.get('voiceName'), 'segments': segments,
        'scenes': [
            {'id': sc['id'], 'startFrame': sc['startFrame'], 'endFrameExclusive': sc['endFrameExclusive'],
             'caption': (sc['captionLines'][0] if sc['captionLines'] else None)} for sc in scenes],
    }
    (prod / 'voice-timeline.json').write_text(json.dumps(timeline, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({k: timeline[k] for k in ('fps','audioSeconds','totalSeconds','totalFrames','voice')}, indent=2))
    for sc in timeline['scenes']:
        print(f"  {sc['startFrame']:>4}-{sc['endFrameExclusive']:<4} {sc['id']:<11} {(sc['caption'] or '(no caption)')[:64]}")

if __name__ == '__main__':
    main()
