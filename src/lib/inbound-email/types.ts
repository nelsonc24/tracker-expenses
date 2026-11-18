/**
 * Provider-neutral shapes for inbound email. Everything provider-specific
 * (payload field names, signature scheme, attachment API) lives in one adapter
 * file (today: `resend.ts`) that implements `InboundEmailProvider`.
 */

/** A received email, reduced to what the importer needs. No body, no contents. */
export interface InboundEmail {
  /** Provider's id for this received email (stable across webhook re-deliveries). */
  emailId: string
  /** RFC 5322 Message-ID header, when the provider gives it. */
  messageId: string | null
  /** Bare, lower-cased sender address. */
  from: string
}

export interface InboundAttachment {
  id: string
  filename: string
  contentType: string | null
  /** Bytes, when the provider reports it. */
  size: number | null
  /** Short-lived signed URL for the content (never logged or stored). */
  downloadUrl: string | null
}

/** Thrown by `verify` when a request is unsigned or the signature doesn't match. */
export class WebhookVerificationError extends Error {
  constructor(message: string, public readonly reason: 'missing_signature' | 'invalid_signature') {
    super(message)
    this.name = 'WebhookVerificationError'
  }
}

/** Thrown by `download` when an attachment is bigger than allowed. */
export class AttachmentTooLargeError extends Error {
  constructor(public readonly size: number) {
    super(`Attachment is ${size} bytes`)
    this.name = 'AttachmentTooLargeError'
  }
}

export interface InboundEmailProvider {
  readonly name: string
  /** Verify the signature on the *raw* body. Returns the parsed payload or throws `WebhookVerificationError`. */
  verify(rawBody: string, headers: Headers): unknown
  /** The received email, or null for events that aren't "email received". */
  parseEvent(payload: unknown): InboundEmail | null
  listAttachments(emailId: string): Promise<InboundAttachment[]>
  /** Download one attachment's bytes; throws `AttachmentTooLargeError` past `maxBytes`. */
  download(attachment: InboundAttachment, maxBytes: number): Promise<Uint8Array>
}
