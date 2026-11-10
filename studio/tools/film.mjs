#!/usr/bin/env node
/**
 * The film conductor. One command per step of the pipeline, so a new motion graphic is a script
 * and a few chapters, never a new codebase.
 *
 *   node tools/film.mjs new    <slug>                     scaffold from templates/film
 *   node tools/film.mjs lines  <slug> [--lead=0.6]        word-level timings -> src/lines.json
 *   node tools/film.mjs audio  <slug>                     narration -> narration-lead.wav
 *   node tools/film.mjs stills <slug> [--frames=…] [--scale=]
 *   node tools/film.mjs score  <slug>                     cues.json -> score.wav
 *   node tools/film.mjs mix    <slug>                     narration-lead + score -> mix.wav
 *   node tools/film.mjs render <slug>
 *   node tools/film.mjs master <slug> [--true-peak=-2.0]
 *   node tools/film.mjs all    <slug>                     score, mix, render, master
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT, validId, project} from './lib.mjs';

const [action = 'help', slugArg, ...rest] = process.argv.slice(2);
const opt = {};
for (const a of rest) {
  const m = /^--([a-z-]+)=?(.*)$/.exec(a);
  if (!m) throw new Error(`Expected --name=value, received ${a}`);
  opt[m[1]] = m[2] || 'true';
}

const run = (cmd, args, cwd = ROOT) => {
  const r = spawnSync(cmd, args, {cwd, stdio: 'inherit'});
  if (r.status !== 0) process.exit(r.status ?? 1);
};
const py = (script, args) => run('python3', [path.join(ROOT, 'tools', script), ...args]);
const node = (script, args) => run(process.execPath, [path.join(ROOT, 'tools', script), ...args]);

const help = () => console.log(`Usage: node tools/film.mjs <action> <slug> [--opt=value]

  new     scaffold a film from templates/film
  lines   word-level timings (needs production/narration.alignment.json + production/scenes.json)
  audio   build production/narration-lead.wav with the same lead used for the picture
  stills  render review stills (--frames=0,60,120 --scale=0.25)
  score   synthesize the score from production/cues.json
  mix     narration + score -> production/mix.wav
  render  full render to renders/<slug>/
  master  audio master against the picture -> renders/<slug>/<slug>-master.mp4
  all     score, mix, render, master`);

const dirOf = (slug) => path.join(ROOT, 'projects', slug);
const specOf = (slug) => JSON.parse(fs.readFileSync(path.join(dirOf(slug), 'project.json'), 'utf8'));
const durationOf = (slug) => {
  const d = JSON.parse(fs.readFileSync(path.join(dirOf(slug), 'src/film-data.json'), 'utf8'));
  return d.durationSeconds;
};

if (action === 'help' || !slugArg) {
  help();
} else {
  const slug = validId(slugArg);
  const dir = dirOf(slug);
  if (action !== 'new' && !fs.existsSync(dir)) throw new Error(`No such film: ${slug}`);

  switch (action) {
    case 'new': {
      if (fs.existsSync(dir)) throw new Error('Film already exists; nothing was overwritten.');
      fs.mkdirSync(path.join(ROOT, 'projects'), {recursive: true});
      fs.cpSync(path.join(ROOT, 'templates/film'), dir, {recursive: true});
      const spec = specOf(slug);
      fs.writeFileSync(path.join(dir, 'project.json'), JSON.stringify({...spec, id: slug}, null, 2) + '\n');
      const fd = path.join(dir, 'src/film-data.json');
      fs.writeFileSync(fd, fs.readFileSync(fd));
      console.log(`Created projects/${slug}.
Next: write production/voiceover.txt, generate the voice, then production/scenes.json,
then \`node tools/film.mjs lines ${slug}\`.`);
      break;
    }
    case 'lines':
      py('word-lines.py', [slug, ...(opt.lead ? [`--lead=${opt.lead}`] : [])]);
      break;
    case 'audio': {
      const lead = Number(opt.lead ?? 0.6);
      const dur = durationOf(slug);
      const src = path.join(dir, 'production/narration.mp3');
      if (!fs.existsSync(src)) throw new Error('Missing production/narration.mp3');
      run('ffmpeg', ['-y', '-v', 'error', '-i', src, '-af',
        `adelay=${Math.round(lead * 1000)}|${Math.round(lead * 1000)},aresample=48000`,
        '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', '-t', String(dur),
        path.join(dir, 'production/narration-lead.wav')]);
      console.log(`production/narration-lead.wav — ${dur}s, ${lead}s lead`);
      break;
    }
    case 'stills':
      node('stills.mjs', [slug, `--frames=${opt.frames ?? '0'}`, `--scale=${opt.scale ?? '0.25'}`]);
      break;
    case 'score':
      py('score.py', ['--cues', path.join(dir, 'production/cues.json'),
        '--out', path.join(dir, 'production/score.wav')]);
      break;
    case 'mix':
      py('mix_audio.py', ['--narration', path.join(dir, 'production/narration-lead.wav'),
        '--score', path.join(dir, 'production/score.wav'),
        '--out', path.join(dir, 'production/mix.wav'), '--duration', String(durationOf(slug))]);
      break;
    case 'render':
      node('motion.mjs', ['render', slug]);
      break;
    case 'master': {
      const picture = path.join(ROOT, 'renders', slug, `${slug}.mp4`);
      const mix = path.join(dir, 'production/mix.wav');
      if (!fs.existsSync(picture)) throw new Error('Render the picture first: node tools/film.mjs render ' + slug);
      if (!fs.existsSync(mix)) throw new Error('Mix the audio first: node tools/film.mjs mix ' + slug);
      py('master-audio.py', ['--picture', picture, '--mix', mix,
        '--output', path.join(ROOT, 'renders', slug, `${slug}-master.mp4`),
        `--true-peak=${opt['true-peak'] ?? '-2.0'}`]);
      break;
    }
    case 'all':
      for (const step of ['score', 'mix', 'render', 'master']) {
        console.log(`\n== ${step} ==`);
        run(process.execPath, [path.join(ROOT, 'tools/film.mjs'), step, slug, ...rest]);
      }
      break;
    default:
      help();
      process.exitCode = 1;
  }
}
