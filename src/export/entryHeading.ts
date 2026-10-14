/**
 * The heading line for an experience or education entry: its name parts joined
 * by `separator` ("Senior Engineer — Acme"), then the location after a comma
 * ("Senior Engineer — Acme, Remote"). A blank location leaves the heading as is.
 */
export function entryHeading(
  parts: ReadonlyArray<string | undefined>,
  location: string | undefined,
  separator: string = ' — '
): string {
  const name = parts.filter(Boolean).join(separator);
  const place = location?.trim();
  if (!place) {
    return name;
  }
  return name ? `${name}, ${place}` : place;
}
