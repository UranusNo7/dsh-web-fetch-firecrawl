/**
 * Per-operation Firecrawl API-key selection and failure cooldown.
 * The pool stores credential references and cooldown timestamps, never key values.
 * @module @uranusno7/dsh-web-fetch-firecrawl/key-pool
 */
/** Default time for which a key is skipped after a key-specific API failure. */
export declare const FIRECRAWL_DEFAULT_KEY_COOLDOWN_MS = 300000;
/** A failure that can be attributed to one Firecrawl account/key. */
export declare class FirecrawlHttpError extends Error {
    readonly status: number;
    /**
     * @param status - Firecrawl's HTTP status.
     * @param message - A response-derived message that must not contain credentials.
     */
    constructor(status: number, message: string);
}
/** Raised when none of the configured credential references resolves to a key. */
export declare class FirecrawlCredentialMissingError extends Error {
    constructor();
}
/** Raised when every configured key is in its failure cooldown window. */
export declare class FirecrawlKeyPoolCooldownError extends Error {
    constructor();
}
/** Resolved options for one shared search/fetch key pool. */
export interface FirecrawlApiKeyPoolOptions {
    /** Optional literal key. When present, credential references are ignored. */
    readonly apiKey?: string;
    /** Credential references, normally environment-variable names. */
    readonly apiKeyRefs: readonly string[];
    /** Resolve one reference for one operation without retaining its value. */
    readonly resolveApiKey: (reference: string) => Promise<string | undefined>;
    /** Cooldown after a key-specific HTTP failure. */
    readonly cooldownMs: number;
}
/**
 * Selects keys round-robin and skips keys that recently returned an account-specific failure.
 * A successful operation advances the cursor; a failed operation is retried with the next
 * usable key only for authentication, credit, permission, or rate-limit statuses.
 */
export declare class FirecrawlApiKeyPool {
    private readonly options;
    private readonly apiKeyRefs;
    private readonly cooldownUntil;
    private nextIndex;
    /**
     * @param options - literal key or credential references plus resolver and cooldown policy.
     */
    constructor(options: FirecrawlApiKeyPoolOptions);
    /** Cheap local usability check; does not resolve credentials or make network calls. */
    available(): boolean;
    /**
     * Run one operation with the first usable key, rotating only on key-specific HTTP failures.
     *
     * @param operation - operation receiving one resolved key value.
     * @returns the operation result.
     */
    run<T>(operation: (apiKey: string) => Promise<T>): Promise<T>;
    private resolveCandidates;
    private advanceAfter;
}
/** Statuses that identify an account/key rather than a malformed request. */
export declare function isKeyRotationStatus(status: number): boolean;
