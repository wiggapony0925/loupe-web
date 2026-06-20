/** Tiny classnames joiner — filters falsy values. Keeps SCSS-module class
 *  composition readable without pulling in a dependency. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
