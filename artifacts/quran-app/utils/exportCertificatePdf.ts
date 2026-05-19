import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SurahCertData = {
  type: "surah";
  personName: string;
  surahEnglishName: string;
  surahArabicName: string;
  surahNumber: number;
  surahAyahCount: number;
  surahJuz: number;
  gregorianDate: string;
  hijriDate?: string;
  durationLabel?: string;
  ayahsPerDayLabel?: string;
};

export type JuzCertData = {
  type: "juz";
  personName: string;
  juzNumber: number;
  totalAyahs: number;
  surahsInJuz: Array<{ name: string; arabicName: string }>;
  gregorianDate: string;
  hijriDate?: string;
  durationLabel?: string;
  ayahsPerDayLabel?: string;
};

export type FullQuranCertData = {
  type: "full-quran";
  personName: string;
  gregorianDate: string;
  hijriDate?: string;
  fullHifzDays: number;
  ayahsPerDay: string;
};

export type CertificateData = SurahCertData | JuzCertData | FullQuranCertData;

// ── HTML helpers ──────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ornament(faint = false): string {
  const stroke = faint ? "#e8e0d0" : "#c9a84c";
  return `<div class="ornament"><svg width="200" height="12" viewBox="0 0 200 12" xmlns="http://www.w3.org/2000/svg">
    <line x1="0" y1="6" x2="93" y2="6" stroke="${stroke}" stroke-width="0.7"/>
    <line x1="107" y1="6" x2="200" y2="6" stroke="${stroke}" stroke-width="0.7"/>
    <polygon points="100,1 105,6 100,11 95,6" fill="none" stroke="${stroke}" stroke-width="0.7"/>
    <circle cx="100" cy="6" r="2" fill="${stroke}" fill-opacity="0.5"/>
  </svg></div>`;
}

function seal(): string {
  const cx = 28;
  const cy = 28;
  const outerR = 27;
  const innerR = 22;
  const perimR = 25;
  const diamonds = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 8;
    const dx = perimR * Math.cos(angle);
    const dy = perimR * Math.sin(angle);
    const ds = 2;
    return `<polygon points="${(cx + dx).toFixed(1)},${(cy + dy - ds).toFixed(1)} ${(cx + dx + ds).toFixed(1)},${(cy + dy).toFixed(1)} ${(cx + dx).toFixed(1)},${(cy + dy + ds).toFixed(1)} ${(cx + dx - ds).toFixed(1)},${(cy + dy).toFixed(1)}" fill="#c9a84c" fill-opacity="0.6"/>`;
  }).join("");
  return `<svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${outerR}" stroke="#c9a84c" stroke-width="0.8" fill="none"/>
    <circle cx="${cx}" cy="${cy}" r="${innerR}" stroke="#c9a84c" stroke-width="0.5" stroke-dasharray="1.5 3.5" fill="none"/>
    ${diamonds}
    <circle cx="${cx}" cy="${cy}" r="16" fill="#f5efe0"/>
    <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="14" fill="#a08040" font-family="serif">&#10022;</text>
  </svg>`;
}

function sealRow(): string {
  return `<div class="seal-row">
    <div class="sig-block"><div class="sig-line"></div><div class="sig-role">TEACHER</div></div>
    <div>${seal()}</div>
    <div class="sig-block"><div class="sig-line"></div><div class="sig-role">INSTITUTION</div></div>
  </div>`;
}

function records(durationLabel?: string, ayahsPerDayLabel?: string): string {
  if (!durationLabel && !ayahsPerDayLabel) return "";
  const rows = [
    durationLabel
      ? `<div class="record-row"><div class="record-left"><div class="record-label">DURATION</div></div><div class="record-value">${esc(durationLabel)}</div></div>`
      : "",
    ayahsPerDayLabel
      ? `<div class="record-row last"><div class="record-left"><div class="record-label">DAILY AVG.</div><div class="record-sublabel">memorized per session</div></div><div class="record-value">${esc(ayahsPerDayLabel)}</div></div>`
      : "",
  ].join("");
  return `${ornament(true)}<div class="records-section">
    <div class="label-xs">MEMORIZATION RECORDS</div>
    <div class="records-list">${rows}</div>
  </div>`;
}

function css(): string {
  return `<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { margin: 0; size: A4; }
    html, body {
      width: 100%;
      background: #faf7f0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
      color: #2d2416;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 595px; min-height: 842px; margin: 0 auto;
      padding: 0 44px 52px;
      display: flex; flex-direction: column; align-items: center;
      background: #faf7f0;
    }
    .accent-strip { width: 100%; height: 3px; background: #c9a84c; opacity: 0.6; }
    .bismillah {
      font-size: 17px; color: #8a7a5a; text-align: center;
      direction: rtl; line-height: 2; margin: 26px 0 4px;
      font-family: 'Al Nile', 'Geeza Pro', 'Arabic Typesetting', serif;
    }
    .ornament { display: flex; align-items: center; justify-content: center; padding: 8px 0; width: 100%; }
    .cert-header {
      text-align: center; padding: 14px 0;
      display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%;
    }
    .label-xs {
      font-size: 8px; font-weight: 700; letter-spacing: 2.5px;
      text-transform: uppercase; color: #bfaa88; text-align: center;
    }
    .cert-title { font-size: 23px; font-weight: 800; letter-spacing: -0.4px; color: #2d2416; text-align: center; }
    .cert-title-ar {
      font-size: 12px; color: #bfaa88; direction: rtl; text-align: center;
      font-family: 'Al Nile', 'Geeza Pro', serif;
    }
    .section {
      padding: 14px 0; width: 100%; text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .person-name { font-size: 23px; font-weight: 700; font-style: italic; letter-spacing: -0.3px; color: #a08040; }
    .completion-stmt { font-size: 11px; line-height: 17px; color: #8a7a5a; text-align: center; }
    .stats-grid { display: flex; width: 100%; padding: 14px 0; }
    .stats-cell {
      flex: 1; text-align: center; display: flex; flex-direction: column;
      align-items: center; gap: 4px; padding: 0 8px;
      border-right: 1px solid #e2d9c8;
    }
    .stats-cell:last-child { border-right: none; }
    .stats-value { font-size: 19px; font-weight: 800; color: #2d2416; }
    .stats-label { font-size: 7px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #bfaa88; }
    .date-line {
      text-align: center; padding: 10px 0; width: 100%;
      display: flex; flex-direction: column; align-items: center; gap: 3px;
    }
    .date-primary { font-size: 9px; font-weight: 700; letter-spacing: 1.8px; text-transform: uppercase; color: #bfaa88; }
    .date-secondary { font-size: 9px; letter-spacing: 0.4px; color: #bfaa88; }
    .seal-row {
      width: 100%; display: flex; justify-content: space-between;
      align-items: flex-end; padding: 10px 8px;
    }
    .sig-block { text-align: center; width: 80px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .sig-line { width: 80px; height: 1px; background: #c9a84c; margin-bottom: 4px; opacity: 0.5; }
    .sig-role { font-size: 8px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: #bfaa88; }
    .records-section { width: 100%; padding: 14px 0; display: flex; flex-direction: column; gap: 10px; }
    .records-list { width: 100%; }
    .record-row {
      display: flex; justify-content: space-between; align-items: flex-end;
      padding: 7px 0; border-bottom: 0.5px solid #ede7db;
    }
    .record-row.last { border-bottom: none; }
    .record-left { display: flex; flex-direction: column; gap: 2px; }
    .record-label { font-size: 8px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #8a7a5a; }
    .record-sublabel { font-size: 8px; color: #bfaa88; }
    .record-value { font-size: 14px; font-weight: 700; color: #2d2416; }
    .hadith-wrap { padding: 18px 0; width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .hadith { font-size: 11px; font-style: italic; line-height: 19px; color: #8a7a5a; text-align: center; max-width: 300px; }
    .hadith-source { font-size: 8px; font-weight: 700; letter-spacing: 1.8px; text-transform: uppercase; color: #bfaa88; margin-top: 4px; }
    .dua-wrap { padding: 18px 0; width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .dua-ar { font-size: 14px; direction: rtl; text-align: center; line-height: 24px; color: #bfaa88; font-family: 'Al Nile', 'Geeza Pro', serif; }
    .dua-en { font-size: 10px; line-height: 16px; color: #bfaa88; text-align: center; }
    .surah-tags { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; padding: 4px 0; }
    .surah-tag { padding: 4px 10px; border-radius: 9999px; border: 1px solid #e2d9c8; background: #f5f0e8; font-size: 11px; color: #8a7a5a; direction: rtl; }
    .section-padded { width: 100%; padding: 14px 0; display: flex; flex-direction: column; gap: 10px; }
  </style>`;
}

function shell(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${css()}</head><body><div class="page">${body}</div></body></html>`;
}

// ── Certificate HTML builders ─────────────────────────────────────────────────

function buildSurahHtml(d: SurahCertData): string {
  const dateSubline = [d.durationLabel, d.ayahsPerDayLabel].filter(Boolean).join(" · ");
  return shell(`
    <div class="accent-strip"></div>
    <div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
    ${ornament()}
    <div class="cert-header">
      <div class="label-xs">MEMORIZATION COMPLETE</div>
      <div class="cert-title">${esc(d.surahEnglishName)}</div>
      <div class="cert-title-ar">${esc(d.surahArabicName)}</div>
    </div>
    ${ornament(true)}
    <div class="section">
      <div class="label-xs">MEMORIZED BY</div>
      <div class="person-name">${esc(d.personName)}</div>
    </div>
    ${ornament()}
    <div class="stats-grid">
      <div class="stats-cell"><div class="stats-value">${d.surahAyahCount}</div><div class="stats-label">AYAHS</div></div>
      <div class="stats-cell"><div class="stats-value">Juz ${d.surahJuz}</div><div class="stats-label">JUZ</div></div>
      <div class="stats-cell"><div class="stats-value">#${d.surahNumber}</div><div class="stats-label">SURAH</div></div>
    </div>
    <div class="date-line">
      <div class="date-primary">${esc(d.gregorianDate)}</div>
      ${d.hijriDate ? `<div class="date-secondary">${esc(d.hijriDate)}</div>` : ""}
      ${dateSubline ? `<div class="date-secondary">${esc(dateSubline)}</div>` : ""}
    </div>
    ${ornament()}
    ${sealRow()}
    ${records(d.durationLabel, d.ayahsPerDayLabel)}
    ${ornament(true)}
    <div class="hadith-wrap">
      <div class="hadith">"Whoever memorizes ten ayahs from the beginning of Surah Al-Kahf will be protected from the Dajjal."</div>
      <div class="hadith-source">SAHIH MUSLIM</div>
    </div>
    ${ornament(true)}
    <div class="dua-wrap">
      <div class="dua-ar">بَارَكَ اللَّهُ فِيكَ</div>
      <div class="dua-en">May this surah be light in your heart and intercession on your Day.</div>
    </div>
  `);
}

function buildJuzHtml(d: JuzCertData): string {
  const dateSubline = [d.durationLabel, d.ayahsPerDayLabel].filter(Boolean).join(" · ");
  const tags = d.surahsInJuz
    .map((s) => `<span class="surah-tag">${esc(s.arabicName)}</span>`)
    .join("");
  return shell(`
    <div class="accent-strip"></div>
    <div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
    ${ornament()}
    <div class="cert-header">
      <div class="label-xs">MEMORIZATION COMPLETE</div>
      <div class="cert-title">Juz ${d.juzNumber}</div>
    </div>
    ${ornament(true)}
    <div class="section">
      <div class="label-xs">MEMORIZED BY</div>
      <div class="person-name">${esc(d.personName)}</div>
    </div>
    ${ornament()}
    <div class="stats-grid">
      <div class="stats-cell"><div class="stats-value">${d.totalAyahs}</div><div class="stats-label">AYAHS</div></div>
      <div class="stats-cell"><div class="stats-value">${d.surahsInJuz.length}</div><div class="stats-label">SURAHS</div></div>
      <div class="stats-cell"><div class="stats-value">${d.juzNumber}</div><div class="stats-label">JUZ</div></div>
    </div>
    <div class="date-line">
      <div class="date-primary">${esc(d.gregorianDate)}</div>
      ${d.hijriDate ? `<div class="date-secondary">${esc(d.hijriDate)}</div>` : ""}
      ${dateSubline ? `<div class="date-secondary">${esc(dateSubline)}</div>` : ""}
    </div>
    ${ornament()}
    ${sealRow()}
    ${ornament(true)}
    <div class="section-padded">
      <div class="label-xs">SURAHS IN THIS JUZ</div>
      <div class="surah-tags">${tags}</div>
    </div>
    ${records(d.durationLabel, d.ayahsPerDayLabel)}
    ${ornament(true)}
    <div class="hadith-wrap">
      <div class="hadith">"The best among you are those who learn the Quran and teach it."</div>
      <div class="hadith-source">SAHIH AL-BUKHARI</div>
    </div>
    ${ornament(true)}
    <div class="dua-wrap">
      <div class="dua-ar">بَارَكَ اللَّهُ فِيكَ</div>
      <div class="dua-en">May this juz be a light in your heart and intercession on your Day.</div>
    </div>
  `);
}

function buildFullQuranHtml(d: FullQuranCertData): string {
  return shell(`
    <div class="accent-strip"></div>
    <div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
    ${ornament()}
    <div class="cert-header">
      <div class="label-xs">CERTIFICATE OF COMPLETION</div>
      <div class="cert-title">Hifz Al-Quran Al-Karim</div>
      <div class="cert-title-ar">حفظ القرآن الكريم</div>
    </div>
    ${ornament(true)}
    <div class="section">
      <div class="label-xs">THIS CERTIFICATE IS PRESENTED TO</div>
      <div class="person-name">${esc(d.personName)}</div>
      <div class="completion-stmt">who has successfully completed the memorization of the entire Holy Quran</div>
    </div>
    ${ornament()}
    <div class="stats-grid">
      <div class="stats-cell"><div class="stats-value">6,236</div><div class="stats-label">AYAHS</div></div>
      <div class="stats-cell"><div class="stats-value">114</div><div class="stats-label">SURAHS</div></div>
      <div class="stats-cell"><div class="stats-value">30</div><div class="stats-label">JUZ</div></div>
    </div>
    <div class="date-line">
      <div class="date-primary">${esc(d.gregorianDate)}</div>
      ${d.hijriDate ? `<div class="date-secondary">${esc(d.hijriDate)}</div>` : ""}
      <div class="date-secondary">${d.fullHifzDays} days · ${esc(d.ayahsPerDay)} ayahs/day</div>
    </div>
    ${ornament()}
    ${sealRow()}
    ${ornament(true)}
    <div class="hadith-wrap">
      <div class="hadith">"It will be said to the companion of the Quran: Recite and rise in status, as you used to recite in the world."</div>
      <div class="hadith-source">JAMI AT-TIRMIDHI</div>
    </div>
    ${ornament(true)}
    <div class="dua-wrap">
      <div class="dua-ar">بَارَكَ اللَّهُ فِيكَ</div>
      <div class="dua-en">May Allah preserve your memorization and elevate you through it.</div>
    </div>
  `);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function exportAndShareCertificate(data: CertificateData): Promise<void> {
  let html: string;

  if (data.type === "surah") {
    html = buildSurahHtml(data);
  } else if (data.type === "juz") {
    html = buildJuzHtml(data);
  } else {
    html = buildFullQuranHtml(data);
  }

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error("Sharing is not available on this device");

  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Share Certificate",
    UTI: "com.adobe.pdf",
  });
}
