#!/usr/bin/env node

import("../dist/server.js").catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
