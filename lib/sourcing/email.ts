// Emails are sent by the user's own email app: Moko only builds the
// mailto: link and the copyable text.

/** A mailto: link that opens a new email in the user's email app. Encodes with %20, not "+", which mail apps would show literally. */
export function mailtoLink(to: string | undefined, subject: string | undefined, body: string): string {
  const params = [subject?.trim() && `subject=${encodeURIComponent(subject.trim())}`, `body=${encodeURIComponent(body)}`].filter(Boolean).join("&");
  return `mailto:${to ? encodeURIComponent(to.trim()).replace(/%40/g, "@") : ""}?${params}`;
}

/** Subject and body as one block, for pasting into an email or chat. */
export function emailText(subject: string | undefined, body: string): string {
  return subject?.trim() ? `Subject: ${subject.trim()}\n\n${body}` : body;
}
