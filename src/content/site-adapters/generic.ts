export function isGenericMediaPage(): boolean {
  return document.querySelector("video, audio") !== null;
}