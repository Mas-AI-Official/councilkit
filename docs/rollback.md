# Rollback and Uninstall

MergeLoop setup writes backups before modifying config files.

## Backup Strategy

- each modified file gets a backup:
  - `<file>.bak.<timestamp>`
- setup prints backup paths in its summary output

## Remove MergeLoop MCP Entry

Use uninstall helper:

```bash
npm run uninstall -- --host=gemini
```

Supported host flags:

- `gemini`
- `antigravity`
- `generic`

Optional explicit file:

```bash
npm run uninstall -- --file=/absolute/path/to/mcp-config.json
```

Dry-run:

```bash
npm run uninstall -- --host=gemini --dry-run
```

## Manual Restore

If you want full rollback, replace modified file with backup:

1. identify backup path printed by setup/uninstall
2. copy backup file over current config file
3. restart/reload host

## Notes

- Rollback only touches config files that setup/uninstall modified.
- Uninstall also removes legacy CouncilKit MCP ids such as `councilkit` and `council-hub` from supported host config files.
- Worker CLI install/auth state is separate from config rollback.
