import sanitizeHtml from 'sanitize-html'

export function sanitizeText(input: string, maxLength = 50000): string {
  const stripped = sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} })
  return stripped.replace(/\x00/g, '').trim().slice(0, maxLength)
}

export function sanitizeShortString(input: string): string {
  return sanitizeText(input, 200)
}
