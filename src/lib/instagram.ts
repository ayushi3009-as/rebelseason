// Instagram usernames: 1-30 characters, letters, numbers, periods and underscores.
const USERNAME_RE = /^(?!\.)(?!.*\.\.)[A-Za-z0-9._]{1,30}$/;

/**
 * Cleans what a customer typed into the Instagram field ("@name", a profile
 * link, stray spaces) and returns the bare username, or null if it isn't a
 * valid Instagram username.
 */
export function normalizeInstagramUsername(input: string): string | null {
  let value = input.trim();
  value = value.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "");
  value = value.replace(/^@+/, "");
  return USERNAME_RE.test(value) ? value : null;
}

export const INSTAGRAM_ERROR = "Please enter a valid Instagram username (letters, numbers, periods and underscores, up to 30 characters).";
