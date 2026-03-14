export const CODEX_OUTPUT_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["summary", "key_points", "risks", "citations_needed"],
    properties: {
        summary: {
            type: "string"
        },
        key_points: {
            type: "array",
            items: {
                type: "string"
            }
        },
        risks: {
            type: "array",
            items: {
                type: "string"
            }
        },
        citations_needed: {
            type: "array",
            items: {
                type: "string"
            }
        }
    }
};
//# sourceMappingURL=schema.js.map