export declare function parseCommand(command: string): {
    executable: string;
    args: string[];
};
export declare function formatCommand(executable: string, args: string[], isWindows: boolean): string;
