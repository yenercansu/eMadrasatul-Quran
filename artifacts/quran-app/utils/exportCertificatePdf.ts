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
  hadith?: string;
  hadithSource?: string;
  dua?: string;
  duaEn?: string;
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

// Ornament sized for the narrower 340px content column
function ornament(faint = false): string {
  const stroke = faint ? "#e0d8c8" : "#c9a84c";
  return `<div class="ornament"><svg width="160" height="12" viewBox="0 0 160 12" xmlns="http://www.w3.org/2000/svg">
    <line x1="0" y1="6" x2="72" y2="6" stroke="${stroke}" stroke-width="0.7"/>
    <line x1="88" y1="6" x2="160" y2="6" stroke="${stroke}" stroke-width="0.7"/>
    <polygon points="80,1 85,6 80,11 75,6" fill="none" stroke="${stroke}" stroke-width="0.7"/>
    <circle cx="80" cy="6" r="2" fill="${stroke}" fill-opacity="0.5"/>
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
  return `<svg width="52" height="52" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
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
      background: #ede7d8;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
      color: #2d2416;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* A4 canvas — full page, warm parchment surround */
    .page {
      width: 595px; min-height: 842px; margin: 0 auto;
      padding: 0;
      display: flex; flex-direction: column; align-items: center;
      background: #ede7d8;
    }
    /* Outer frame — ~67% of A4 width, double-border archival structure */
    .doc-outer {
      width: 398px;
      margin: 30px 0 40px;
      padding: 5px;
      background: #faf7f0;
      border: 0.7px solid #c9a84c;
    }
    /* Inner frame — hair-thin inset border for double-frame effect */
    .doc-inner {
      width: 100%;
      border: 0.4px solid rgba(201, 168, 76, 0.38);
      padding: 0 26px 28px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    /* Gold accent strip spans the full inner width */
    .accent-strip {
      width: calc(100% + 52px);
      margin: 0 -26px 0;
      height: 3px;
      background: #c9a84c;
      opacity: 0.65;
      display: block;
    }
    .bismillah {
      font-size: 16px; color: #8a7a5a; text-align: center;
      direction: rtl; line-height: 2; margin: 20px 0 2px;
      font-family: 'Al Nile', 'Geeza Pro', 'Arabic Typesetting', serif;
    }
    .ornament { display: flex; align-items: center; justify-content: center; padding: 6px 0; width: 100%; }
    .cert-header {
      text-align: center; padding: 10px 0;
      display: flex; flex-direction: column; align-items: center; gap: 5px; width: 100%;
    }
    .label-xs {
      font-size: 7.5px; font-weight: 700; letter-spacing: 2.5px;
      text-transform: uppercase; color: #bfaa88; text-align: center;
    }
    .cert-title { font-size: 22px; font-weight: 800; letter-spacing: -0.3px; color: #2d2416; text-align: center; }
    .cert-title-ar {
      font-size: 12px; color: #bfaa88; direction: rtl; text-align: center;
      font-family: 'Al Nile', 'Geeza Pro', serif;
    }
    .section {
      padding: 10px 0; width: 100%; text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 6px;
    }
    .person-name { font-size: 22px; font-weight: 700; font-style: italic; letter-spacing: -0.3px; color: #a08040; }
    .completion-stmt { font-size: 10px; line-height: 16px; color: #8a7a5a; text-align: center; max-width: 260px; }
    /* Stats grid — narrower col means cells tighter */
    .stats-grid { display: flex; width: 100%; padding: 10px 0; }
    .stats-cell {
      flex: 1; text-align: center; display: flex; flex-direction: column;
      align-items: center; gap: 3px; padding: 0 4px;
      border-right: 0.5px solid #e2d9c8;
    }
    .stats-cell:last-child { border-right: none; }
    .stats-value { font-size: 17px; font-weight: 800; color: #2d2416; }
    .stats-label { font-size: 7px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #bfaa88; }
    .date-line {
      text-align: center; padding: 8px 0; width: 100%;
      display: flex; flex-direction: column; align-items: center; gap: 2px;
    }
    .date-primary { font-size: 8.5px; font-weight: 700; letter-spacing: 1.8px; text-transform: uppercase; color: #bfaa88; }
    .date-secondary { font-size: 8.5px; letter-spacing: 0.4px; color: #bfaa88; }
    /* Seal row — tighter, compressed */
    .seal-row {
      width: 100%; display: flex; justify-content: space-between;
      align-items: flex-end; padding: 8px 0;
    }
    .sig-block { text-align: center; width: 68px; display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .sig-line { width: 68px; height: 0.5px; background: rgba(201,168,76,0.6); margin-bottom: 3px; }
    .sig-role { font-size: 7px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: #bfaa88; }
    /* Records */
    .records-section { width: 100%; padding: 10px 0; display: flex; flex-direction: column; gap: 8px; }
    .records-list { width: 100%; }
    .record-row {
      display: flex; justify-content: space-between; align-items: flex-end;
      padding: 6px 0; border-bottom: 0.5px solid #ede7db;
    }
    .record-row.last { border-bottom: none; }
    .record-left { display: flex; flex-direction: column; gap: 2px; }
    .record-label { font-size: 7.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #8a7a5a; }
    .record-sublabel { font-size: 7.5px; color: #bfaa88; }
    .record-value { font-size: 13px; font-weight: 700; color: #2d2416; }
    /* Hadith */
    .hadith-wrap { padding: 12px 0; width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .hadith { font-size: 10.5px; font-style: italic; line-height: 18px; color: #8a7a5a; text-align: center; }
    .hadith-source { font-size: 7.5px; font-weight: 700; letter-spacing: 1.8px; text-transform: uppercase; color: #bfaa88; margin-top: 3px; }
    /* Dua */
    .dua-wrap { padding: 12px 0; width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 5px; }
    .dua-ar { font-size: 13px; direction: rtl; text-align: center; line-height: 22px; color: #bfaa88; font-family: 'Al Nile', 'Geeza Pro', serif; }
    .dua-en { font-size: 9.5px; line-height: 15px; color: #bfaa88; text-align: center; }
    /* Surah tags for juz cert */
    .surah-tags { display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; padding: 4px 0; }
    .surah-tag { padding: 3px 9px; border-radius: 9999px; border: 0.5px solid #e2d9c8; background: #f5f0e8; font-size: 10px; color: #8a7a5a; direction: rtl; }
    .section-padded { width: 100%; padding: 10px 0; display: flex; flex-direction: column; gap: 8px; }
  </style>`;
}

// Shell wraps content in the double-frame document structure
function shell(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${css()}</head><body>
    <div class="page">
      <div class="doc-outer">
        <div class="doc-inner">${body}</div>
      </div>
    </div>
  </body></html>`;
}

// ── Certificate HTML builders ─────────────────────────────────────────────────

function buildSurahHtml(d: SurahCertData): string {
  const dateSubline = [d.durationLabel, d.ayahsPerDayLabel].filter(Boolean).join(" · ");
  const hadith = d.hadith ?? "The best among you are those who learn the Quran and teach it.";
  const hadithSource = d.hadithSource ?? "SAHIH AL-BUKHARI";
  const dua = d.dua ?? "بَارَكَ اللَّهُ فِيكَ";
  const duaEn = d.duaEn ?? "May this surah be light in your heart and intercession on your Day.";

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
      <div class="hadith">"${esc(hadith)}"</div>
      <div class="hadith-source">${esc(hadithSource)}</div>
    </div>
    ${ornament(true)}
    <div class="dua-wrap">
      <div class="dua-ar">${esc(dua)}</div>
      <div class="dua-en">${esc(duaEn)}</div>
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
