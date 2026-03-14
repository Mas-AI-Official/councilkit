export declare const CODEX_OUTPUT_SCHEMA: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly required: readonly ["summary", "key_points", "risks", "citations_needed"];
    readonly properties: {
        readonly summary: {
            readonly type: "string";
        };
        readonly key_points: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
        };
        readonly risks: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
        };
        readonly citations_needed: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
        };
    };
};
