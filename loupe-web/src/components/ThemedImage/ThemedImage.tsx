import { type ImgHTMLAttributes } from "react";
import { useActiveTheme } from "@/theme";

export interface ThemedImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  /** Source shown in light mode. */
  light: string;
  /** Source shown in dark mode. */
  dark: string;
  /** Required — these are content images, not decoration. */
  alt: string;
}

/**
 * An `<img>` that swaps source by the active theme — for logos / artwork that
 * need a dark-mode variant. Reacts live to theme changes via `useActiveTheme`
 * (so it flips the instant the theme does, including external changes). Source
 * is type-agnostic: png, svg, webp — anything an `<img>` can load.
 *
 *   <ThemedImage light={logoLight} dark={logoDark} alt="Loupe" width={120} />
 */
export function ThemedImage({ light, dark, alt, ...rest }: ThemedImageProps) {
  const theme = useActiveTheme();
  return <img src={theme === "dark" ? dark : light} alt={alt} {...rest} />;
}
