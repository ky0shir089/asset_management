import sanitizeHtml from "sanitize-html"

const options: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "strong",
    "em",
    "s",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "br",
    "hr",
  ],
  allowedAttributes: {},
  transformTags: {
    h1: "p",
    h2: "p",
    h3: "p",
    h4: "p",
    h5: "p",
    h6: "p",
  },
  parseStyleAttributes: false,
}

export function sanitizeRichText(html: string) {
  return sanitizeHtml(html, options)
}
