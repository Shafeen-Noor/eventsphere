import { customAlphabet } from "nanoid";

const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
const nano = customAlphabet(alphabet, 8);

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  return base.length >= 3 ? `${base}-${nano()}` : `event-${nano()}`;
}
