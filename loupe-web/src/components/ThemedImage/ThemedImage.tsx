import { type ImgHTMLAttributes } from "react";
import { THEME_MODE } from "@loupe/theme";
import { useThemeMode } from "@/theme";

export interface ThemedImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  /** Source shown in light mode (and the fallback when no dark variant). */
  lightSrc: string;
  /** Source shown in dark mode. Optional — falls back to `lightSrc`. */
  darkSrc?: string;
  /** Required — these are content images, not decoration. */
  alt: string;
}

/**
 * Simple themed image: pass the light image and (optionally) the dark image,
 * and it swaps source by the active theme — for logos / artwork that need a
 * dark-mode variant. Reacts live to theme changes via `useThemeMode` (so it
 * flips the instant the theme does, including external changes). Source is
 * type-agnostic: png, svg, webp — anything an `<img>` can load.
 *
 *   <ThemedImage lightSrc={logoLight} darkSrc={logoDark} alt="Loupe" width={120} />
 */
export function ThemedImage({ lightSrc, darkSrc, alt, ...rest }: ThemedImageProps) {
  const themeMode = useThemeMode();
  const src = themeMode === THEME_MODE.DARK && darkSrc ? darkSrc : lightSrc;
  return src ? <img src={src} alt={alt} {...rest} /> : null;
}

export default ThemedImage;
