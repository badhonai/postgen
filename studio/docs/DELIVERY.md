
## Pruning old media (after a re-cut is delivered)

`POST /api/v1/assets/delete` (agent key) removes an asset only while no post uses it —
attached media answers 409, so a live draft can never lose its video.

```
# dry run (default) — only --match globs are candidates
POSTGEN_API_KEY=pgk_live_… node tools/postgen/cleanup.mjs \
  --project <uuid> --match 'voiceover-*.mp3' --keep '<delivered-narration>.mp3'
# then repeat with --confirm
```

`--match` is required on purpose: a project also holds the media of its earlier posts
(covers, style boards, logos), so a blanket sweep is never the right call.

Deletion is refused (409) while **either** a post or a saved image prompt references the
asset, so the delivered master and any prompt reference images are structurally safe.
