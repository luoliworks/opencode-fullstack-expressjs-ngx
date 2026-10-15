// URL-friendly slug from a title. ASCII-only by design: lowercase,
// whitespace/underscores become '-', everything else is dropped.
// Returns '' when nothing ASCII remains (e.g. pure-Chinese titles) —
// the caller should then ask for a manual slug instead of guessing.
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
