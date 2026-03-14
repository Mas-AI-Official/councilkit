const WHITESPACE = /\s/;

export function parseCommand(command: string): { executable: string; args: string[] } {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | "\"" | null = null;
  let escaping = false;

  for (const char of command.trim()) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === "'" || char === "\"") {
      quote = char;
      continue;
    }

    if (WHITESPACE.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (escaping) {
    current += "\\";
  }

  if (quote) {
    throw new Error(`Invalid command string with unclosed quote: ${command}`);
  }

  if (current) {
    tokens.push(current);
  }

  if (tokens.length === 0) {
    throw new Error("Command string cannot be empty.");
  }

  return {
    executable: tokens[0],
    args: tokens.slice(1)
  };
}

function quotePosix(part: string): string {
  if (part.length === 0) {
    return "''";
  }

  if (/^[A-Za-z0-9_./:-]+$/.test(part)) {
    return part;
  }

  return `'${part.replace(/'/g, `'\"'\"'`)}'`;
}

function quoteWindows(part: string): string {
  if (part.length === 0) {
    return "\"\"";
  }

  if (!/[ \t"]/u.test(part)) {
    return part;
  }

  const escaped = part.replace(/(\\*)"/g, "$1$1\\\"");
  return `"${escaped.replace(/(\\+)$/g, "$1$1")}"`;
}

export function formatCommand(executable: string, args: string[], isWindows: boolean): string {
  const parts = [executable, ...args];
  return parts.map((part) => (isWindows ? quoteWindows(part) : quotePosix(part))).join(" ");
}
