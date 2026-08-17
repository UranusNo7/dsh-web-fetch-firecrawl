/**
 * Per-operation Firecrawl API-key selection and failure cooldown.
 * The pool stores credential references and cooldown timestamps, never key values.
 * @module @uranusno7/dsh-web-fetch-firecrawl/key-pool
 */

/** Default time for which a key is skipped after a key-specific API failure. */
export const FIRECRAWL_DEFAULT_KEY_COOLDOWN_MS = 300_000

/** A failure that can be attributed to one Firecrawl account/key. */
export class FirecrawlHttpError extends Error {
  readonly status: number

  /**
   * @param status - Firecrawl's HTTP status.
   * @param message - A response-derived message that must not contain credentials.
   */
  constructor(status: number, message: string) {
    super(message)
    this.name = 'FirecrawlHttpError'
    this.status = status
  }
}

/** Raised when none of the configured credential references resolves to a key. */
export class FirecrawlCredentialMissingError extends Error {
  constructor() {
    super('no Firecrawl API key is configured')
    this.name = 'FirecrawlCredentialMissingError'
  }
}

/** Raised when every configured key is in its failure cooldown window. */
export class FirecrawlKeyPoolCooldownError extends Error {
  constructor() {
    super('all configured Firecrawl API keys are cooling down')
    this.name = 'FirecrawlKeyPoolCooldownError'
  }
}

/** Resolved options for one shared search/fetch key pool. */
export interface FirecrawlApiKeyPoolOptions {
  /** Optional literal key. When present, credential references are ignored. */
  readonly apiKey?: string
  /** Credential references, normally environment-variable names. */
  readonly apiKeyRefs: readonly string[]
  /** Resolve one reference for one operation without retaining its value. */
  readonly resolveApiKey: (reference: string) => Promise<string | undefined>
  /** Cooldown after a key-specific HTTP failure. */
  readonly cooldownMs: number
}

interface Candidate {
  readonly index: number
  readonly reference: string
  readonly value: string
}

/**
 * Selects keys round-robin and skips keys that recently returned an account-specific failure.
 * A successful operation advances the cursor; a failed operation is retried with the next
 * usable key only for authentication, credit, permission, or rate-limit statuses.
 */
export class FirecrawlApiKeyPool {
  private readonly apiKeyRefs: readonly string[]
  private readonly cooldownUntil = new Map<string, number>()
  private nextIndex = 0

  /**
   * @param options - literal key or credential references plus resolver and cooldown policy.
   */
  constructor(private readonly options: FirecrawlApiKeyPoolOptions) {
    this.apiKeyRefs = [...new Set(options.apiKeyRefs.filter((reference) => reference.length > 0))]
  }

  /** Cheap local usability check; does not resolve credentials or make network calls. */
  available(): boolean {
    return (this.options.apiKey?.length ?? 0) > 0 || this.apiKeyRefs.length > 0
  }

  /**
   * Run one operation with the first usable key, rotating only on key-specific HTTP failures.
   *
   * @param operation - operation receiving one resolved key value.
   * @returns the operation result.
   */
  async run<T>(operation: (apiKey: string) => Promise<T>): Promise<T> {
    const candidates = await this.resolveCandidates()
    let lastRotatableError: FirecrawlHttpError | undefined

    for (const candidate of candidates) {
      try {
        const result = await operation(candidate.value)
        this.cooldownUntil.delete(candidate.reference)
        this.advanceAfter(candidate.index)
        return result
      } catch (error: unknown) {
        if (!(error instanceof FirecrawlHttpError) || !isKeyRotationStatus(error.status)) throw error
        this.cooldownUntil.set(candidate.reference, Date.now() + this.options.cooldownMs)
        lastRotatableError = error
      }
    }

    if (lastRotatableError !== undefined) throw lastRotatableError
    throw new FirecrawlCredentialMissingError()
  }

  private async resolveCandidates(): Promise<readonly Candidate[]> {
    if (this.options.apiKey !== undefined && this.options.apiKey.length > 0) {
      return [{ index: 0, reference: 'literal', value: this.options.apiKey }]
    }
    if (this.apiKeyRefs.length === 0) throw new FirecrawlCredentialMissingError()

    const now = Date.now()
    const candidates: Candidate[] = []
    let coolingCount = 0
    for (let offset = 0; offset < this.apiKeyRefs.length; offset += 1) {
      const index = (this.nextIndex + offset) % this.apiKeyRefs.length
      const reference = this.apiKeyRefs[index]
      if (reference === undefined) continue
      const cooldown = this.cooldownUntil.get(reference)
      if (cooldown !== undefined && cooldown > now) {
        coolingCount += 1
        continue
      }
      const value = await this.options.resolveApiKey(reference)
      if (value !== undefined && value.length > 0) candidates.push({ index, reference, value })
    }

    if (candidates.length > 0) return candidates
    if (coolingCount === this.apiKeyRefs.length) throw new FirecrawlKeyPoolCooldownError()
    throw new FirecrawlCredentialMissingError()
  }

  private advanceAfter(index: number): void {
    if (this.apiKeyRefs.length > 0) this.nextIndex = (index + 1) % this.apiKeyRefs.length
  }
}

/** Statuses that identify an account/key rather than a malformed request. */
export function isKeyRotationStatus(status: number): boolean {
  return status === 401 || status === 402 || status === 403 || status === 429
}
