# Railway Deploy Checklist

Quick sanity checks before pushing any `railway.json` or Railway config changes.

## Before You Commit

- [ ] `railway.json` is **plain UTF-8 text**, not base64-encoded
- [ ] Run `cat railway.json` — output should look like `{ "deploy": { ... } }`, not a long garbled string
- [ ] Validate JSON syntax: `python3 -m json.tool railway.json` (should print formatted JSON, no errors)
- [ ] Confirm env vars (e.g., `DISCORD_TOKEN`, `TELEGRAM_TOKEN`) are set in Railway → Service → Variables — not hardcoded in config files

## After You Deploy

- [ ] Watch the Railway build log for `Build succeeded` before closing the tab
- [ ] If bot-based service: confirm bot comes online in Discord/Telegram within ~60 seconds of deploy
- [ ] No `TokenInvalid` or `Error [TokenInvalid]` errors in runtime logs

## Common Traps

| Mistake | Symptom | Fix |
|---|---|---|
| `railway.json` committed as base64 | `invalid character 'e'` parse error in build log | Re-write file as plain JSON; use `echo '{...}' > railway.json` |
| Missing `DISCORD_TOKEN` | `Error [TokenInvalid]` on startup | Add/correct token in Railway → Service → Variables |
| Build tools in `devDependencies` | Build exits with code 1 | Move `typescript`, build CLIs, etc. to `dependencies` |
