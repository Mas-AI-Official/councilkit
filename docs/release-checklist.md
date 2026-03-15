# Release Checklist

## 1) Build + Validation

- [ ] Clean clone
- [ ] `npm ci`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run smoke`
- [ ] `npm run doctor` (missing external CLIs is acceptable if documented)
- [ ] `npm pack --dry-run`
- [ ] `npm run setup -- --dry-run`
- [ ] `npm run uninstall -- --host=generic --dry-run`

## 2) README + Visual QA

- [ ] README hero renders cleanly in GitHub preview
- [ ] Top section is scannable in under 30 seconds
- [ ] `docs/demo/workflow.svg` text fits and connectors align
- [ ] `docs/demo/discovery-routing.svg` text fits and connectors align
- [ ] `docs/demo/support-matrix.svg` rows are readable
- [ ] `docs/demo/output-example.svg` sections are readable
- [ ] `docs/demo/storyboard/index.html` loads and cycles frames
- [ ] `assets/social-preview.png` looks clean at social crop sizes

## 3) Messaging + Claims

- [ ] About line is accurate (no overclaiming)
- [ ] Tagline is set
- [ ] Support levels remain explicit (first-class/documented/manual/experimental/planned)
- [ ] No claim of universal IDE/agent support
- [ ] No claim of unsupported providers as implemented

## 4) Release Metadata

- [ ] Suggested release title chosen
- [ ] Release notes draft reviewed
- [ ] Changelog entry prepared
- [ ] License/security/contributing links valid

## 5) Release Type Decision

- Pre-release (`v0.1.0-beta.1`) if any major visual/demo rough edges remain.
- Stable (`v0.1.0`) if README, visuals, smoke checks, and packaging are all clean.
