import { Router, type IRouter } from "express";
import { tafsirs, type TafsirKey } from "../config/tafsirs";

const router: IRouter = Router();
const QURAN_COM_API_BASE_URL = "https://api.quran.com/api/v4";

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function readText(value: unknown): string {
  if (typeof value === "string") return stripHtml(value);
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  return readText(record.text ?? record.content ?? record.tafsir);
}

router.get("/quran/tafsirs/config", (_req, res) => {
  res.json({ tafsirs });
});

router.get("/quran/tafsirs/:key/ayah/:verseKey", async (req, res, next) => {
  try {
    const key = req.params.key as TafsirKey;
    const config = tafsirs[key];
    if (!config) {
      res.status(404).json({ code: "TAFSIR_NOT_FOUND", message: "Unknown tafsir key." });
      return;
    }
    if (!("resourceId" in config) || !config.resourceId) {
      res.status(404).json({ code: "TAFSIR_SOURCE_UNAVAILABLE", message: "Tafsir source is not configured for remote content yet." });
      return;
    }

    const url = `${QURAN_COM_API_BASE_URL}/tafsirs/${config.resourceId}/by_ayah/${encodeURIComponent(req.params.verseKey)}`;
    const response = await fetch(url);
    if (!response.ok) {
      res.status(response.status).json({ code: "TAFSIR_UPSTREAM_ERROR", message: "Could not fetch tafsir content." });
      return;
    }
    const data = await response.json() as Record<string, unknown>;
    const tafsir = data.tafsir && typeof data.tafsir === "object" ? data.tafsir as Record<string, unknown> : data;
    res.json({
      key,
      verseKey: req.params.verseKey,
      resourceName: config.name,
      text: readText(tafsir.text ?? tafsir),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
