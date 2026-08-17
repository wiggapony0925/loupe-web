/**
 * File delivery bridge. On device, "downloading" is the wrong verb — the
 * right UX is the native share sheet (AirDrop, Save to Files, Mail, …), so
 * exports are written to the app cache via Filesystem and handed to
 * Share.share(). On the web it's a plain anchor download.
 */
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNative } from './platform';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const dataUrl = String(reader.result);
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

export async function deliverFile(blob: Blob, filename: string, title?: string): Promise<void> {
  if (isNative()) {
    const data = await blobToBase64(blob);
    const written = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Cache,
    });
    await Share.share({
      title: title ?? filename,
      files: [written.uri],
    });
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on a delay — revoking synchronously races the navigation in
  // WebKit and yields an empty file.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function shareContent(title: string, text: string): Promise<boolean> {
  if (isNative()) {
    await Share.share({ title, text }).catch(() => undefined);
    return true;
  }
  if (navigator.share) {
    await navigator.share({ title, text }).catch(() => undefined);
    return true;
  }
  return false; // caller falls back to clipboard/UI
}
