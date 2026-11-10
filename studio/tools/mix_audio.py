#!/usr/bin/env python3
"""Mix narration + original score into one PCM bed, with the score ducked under speech.

Original audio is decoded without resampling artefacts (48 kHz/stereo PCM out), the score is
side-chain compressed by the narration, and nothing is limited twice. Always outputs PCM so
tools/master-audio.py can do the single loudness pass.
"""
import argparse, json, subprocess
from pathlib import Path

def run(args):
    return subprocess.run(args, capture_output=True, text=True, check=True)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--narration', type=Path, required=True)
    ap.add_argument('--score', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--duration', type=float, required=True, help='film duration in seconds')
    ap.add_argument('--narration-gain', type=float, default=1.0)
    ap.add_argument('--score-gain', type=float, default=0.9)
    a = ap.parse_args()

    a.out.parent.mkdir(parents=True, exist_ok=True)
    # 1) narration -> PCM 48k stereo, padded to the film length
    run(['ffmpeg','-y','-v','error','-i',str(a.narration),
         '-af',f'volume={a.narration_gain},aresample=48000,apad=whole_dur={a.duration}',
         '-ac','2','-ar','48000','-c:a','pcm_s16le','-t',str(a.duration),
         str(a.out.with_suffix('.narr.wav'))])
    # 2) score -> PCM 48k stereo, trimmed/padded to the film length
    run(['ffmpeg','-y','-v','error','-i',str(a.score),
         '-af',f'volume={a.score_gain},aresample=48000,apad=whole_dur={a.duration}',
         '-ac','2','-ar','48000','-c:a','pcm_s16le','-t',str(a.duration),
         str(a.out.with_suffix('.score.wav'))])
    # 3) duck the score with the narration as the sidechain, then sum
    graph = (
        '[1:a]asplit=2[narr][key];'
        '[0:a][key]sidechaincompress=threshold=0.03:ratio=6:attack=12:release=320:makeup=1[duck];'
        '[duck][narr]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,'
        f'alimiter=limit=0.95,atrim=0:{a.duration}[mix]'
    )
    run(['ffmpeg','-y','-v','error',
         '-i',str(a.out.with_suffix('.score.wav')),'-i',str(a.out.with_suffix('.narr.wav')),
         '-filter_complex',graph,'-map','[mix]','-ac','2','-ar','48000','-c:a','pcm_s16le',str(a.out)])
    a.out.with_suffix('.narr.wav').unlink(missing_ok=True)
    a.out.with_suffix('.score.wav').unlink(missing_ok=True)

    probe = json.loads(subprocess.check_output(
        ['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(a.out)], text=True))
    print(json.dumps({'mix': str(a.out), 'duration': float(probe['format']['duration'])}, indent=2))

if __name__ == '__main__':
    main()
