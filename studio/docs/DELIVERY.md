
## Pruning old media (after a re-cut is delivered)

`POST /api/v1/assets/delete` (agent key) removes an asset only while no post uses it —
attached media answers 409, so a live draft can never lose its video.

```
POSTGEN_API_KEY=pgk_live_… node tools/postgen/cleanup.mjs \
  --project <uuid> --keep <delivered-master>.mp4            # dry run
POSTGEN_API_KEY=pgk_live_… node tools/postgen/cleanup.mjs \
  --project <uuid> --keep <delivered-master>.mp4 --confirm  # actually delete
```

Always pass `--keep` for the master that the draft points at; everything else in the
project (audition MP3s, test renders, superseded cuts) is safe to remove.
