import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STYLES_PATH = resolve(process.cwd(), "android/app/src/main/res/values/styles.xml");
const SPLASH_BG = "#FFFBF7";
const APP_THEME_STYLE = "AppTheme.NoActionBar";
const BACKGROUND_ITEM = `<item name="android:background">${SPLASH_BG}</item>`;

export function patchAndroidSplash(stylesPath = STYLES_PATH): "missing" | "patched" | "unchanged" {
  if (!existsSync(stylesPath)) return "missing";

  const original = readFileSync(stylesPath, "utf8");
  const styleOpen = new RegExp(`<style\\s+name="${APP_THEME_STYLE}"[^>]*>`);
  const match = original.match(styleOpen);
  if (!match) return "unchanged";

  const insertionIndex = match.index! + match[0].length;
  const body = original.slice(insertionIndex, original.indexOf("</style>", insertionIndex));

  if (body.includes('name="android:background"')) return "unchanged";

  const patched =
    original.slice(0, insertionIndex) +
    `\n        ${BACKGROUND_ITEM}` +
    original.slice(insertionIndex);

  writeFileSync(stylesPath, patched, "utf8");
  return "patched";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = patchAndroidSplash();
  if (result === "missing") {
    console.log("[patch-android-splash] android/ not generated yet — skipping");
  } else if (result === "patched") {
    console.log(`[patch-android-splash] added ${BACKGROUND_ITEM} to ${APP_THEME_STYLE}`);
  } else {
    console.log("[patch-android-splash] already patched — no changes");
  }
}
