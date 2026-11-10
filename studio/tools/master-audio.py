"""Optional, credential-free two-pass PCM audio master. Does not generate music/voice."""
from pathlib import Path
import argparse,json,re,subprocess,os
p=argparse.ArgumentParser();p.add_argument('--picture',type=Path,required=True);p.add_argument('--mix',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--lufs',type=float,default=-14);p.add_argument('--true-peak',type=float,default=-1.5);a=p.parse_args()
if a.output.resolve() in [a.picture.resolve(),a.mix.resolve()]:p.error('Output must differ from both inputs.')
def probe(f):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(f)],text=True))
def run(args):return subprocess.run(['ffmpeg','-y','-hide_banner']+args,capture_output=True,text=True,check=True)
def measure(text):return json.loads(re.findall(r'\{[^{}]*\}',text,re.S)[-1])
v=next(s for s in probe(a.picture)['streams'] if s['codec_type']=='video');audio=next(s for s in probe(a.mix)['streams'] if s['codec_type']=='audio')
if not audio['codec_name'].startswith('pcm_'):p.error('Use the original PCM mix, not a previously lossy preview encode.')
duration=float(v['duration']);target=f'loudnorm=I={a.lufs}:TP={a.true_peak}:LRA=7'
m=measure(run(['-i',str(a.mix),'-af',target+':print_format=json','-f','null','-']).stderr)
af=target+':linear=true:measured_I={input_i}:measured_TP={input_tp}:measured_LRA={input_lra}:measured_thresh={input_thresh}:offset={target_offset}'.format(**m)
a.output.parent.mkdir(parents=True,exist_ok=True);tmp=a.output.with_name(a.output.stem+'.mastering.tmp.mp4')
try:
 run(['-i',str(a.picture),'-i',str(a.mix),'-map','0:v:0','-map','1:a:0','-c:v','copy','-af',af,'-ar','48000','-ac','2','-c:a','aac','-b:a','320k','-t',str(duration),'-movflags','+faststart',str(tmp)])
 final=measure(run(['-i',str(tmp),'-af',target+':print_format=json','-f','null','-']).stderr);out=probe(tmp);ov=next(s for s in out['streams'] if s['codec_type']=='video')
 run(['-v','error','-i',str(tmp),'-f','null','-']);assert int(ov['nb_frames'])==int(v['nb_frames']);assert float(final['input_tp'])<=-1
 os.replace(tmp,a.output);report={'fullDecode':True,'videoStreamCopied':True,'videoFrames':int(v['nb_frames']),'duration':out['format']['duration'],'encodedLUFS':float(final['input_i']),'encodedTruePeakDBTP':float(final['input_tp'])};a.output.with_suffix('.master.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
finally:
 if tmp.exists():tmp.unlink()
