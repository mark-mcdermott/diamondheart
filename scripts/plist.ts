export const plistString = (value: string) => `<string>${value}</string>`;

/**
 * Adds the entries a plist's top-level dict does not have yet, each value
 * given as its XML. Null when there is nothing to add, or no dict to add to.
 */
export function withPlistEntries(plist: string, entries: Record<string, string>): string | null {
  const missing = Object.entries(entries).filter(([key]) => !plist.includes(`<key>${key}</key>`));
  const closing = plist.lastIndexOf("</dict>");
  if (missing.length === 0 || closing === -1) return null;

  const added = missing.map(([key, value]) => `\t<key>${key}</key>\n\t${value}\n`).join("");
  return plist.slice(0, closing) + added + plist.slice(closing);
}
