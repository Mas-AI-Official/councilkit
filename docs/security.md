# Security Notes

CouncilKit is an orchestration layer. It does not implement vendor authentication itself.

## Security Model

- Local execution by default (`node dist/server.js`).
- No token scraping or session replay.
- No hidden telemetry in runtime code.
- Run artifacts written locally (configurable persistence path).

## Trust Boundaries

1. Host/editor calling MCP.
2. Council Hub process.
3. Worker CLIs.
4. Any external data accessed by those workers.

Treat worker output as untrusted until validated.

## Operational Guidance

- Keep sensitive repos on trusted machines.
- Review custom worker commands before enabling.
- Treat worker output as untrusted input (prompt-injection risk still applies).
- Disable persistence when prompts/results may include sensitive data.
- Pin CLI versions in team environments when reproducibility matters.

## References

- [`SECURITY.md`](../SECURITY.md)
- [`LEGAL_COMPLIANCE.md`](../LEGAL_COMPLIANCE.md)
- MCP security best practices: https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices
