export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  ayahCount: number;
  juz: number;
}

export interface AyahRef {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
}

export const SURAH_DATA: SurahMeta[] = [
  { number: 1, name: "الفاتحة", englishName: "Al-Faatiha", ayahCount: 7, juz: 1 },
  { number: 2, name: "البقرة", englishName: "Al-Baqara", ayahCount: 286, juz: 1 },
  { number: 3, name: "آل عمران", englishName: "Aal-i-Imraan", ayahCount: 200, juz: 3 },
  { number: 4, name: "النساء", englishName: "An-Nisaa", ayahCount: 176, juz: 4 },
  { number: 5, name: "المائدة", englishName: "Al-Maaida", ayahCount: 120, juz: 6 },
  { number: 6, name: "الأنعام", englishName: "Al-An'aam", ayahCount: 165, juz: 7 },
  { number: 7, name: "الأعراف", englishName: "Al-A'raaf", ayahCount: 206, juz: 8 },
  { number: 8, name: "الأنفال", englishName: "Al-Anfaal", ayahCount: 75, juz: 9 },
  { number: 9, name: "التوبة", englishName: "At-Tawba", ayahCount: 129, juz: 10 },
  { number: 10, name: "يونس", englishName: "Yunus", ayahCount: 109, juz: 11 },
  { number: 11, name: "هود", englishName: "Hud", ayahCount: 123, juz: 11 },
  { number: 12, name: "يوسف", englishName: "Yusuf", ayahCount: 111, juz: 12 },
  { number: 13, name: "الرعد", englishName: "Ar-Ra'd", ayahCount: 43, juz: 13 },
  { number: 14, name: "إبراهيم", englishName: "Ibrahim", ayahCount: 52, juz: 13 },
  { number: 15, name: "الحجر", englishName: "Al-Hijr", ayahCount: 99, juz: 14 },
  { number: 16, name: "النحل", englishName: "An-Nahl", ayahCount: 128, juz: 14 },
  { number: 17, name: "الإسراء", englishName: "Al-Isra", ayahCount: 111, juz: 15 },
  { number: 18, name: "الكهف", englishName: "Al-Kahf", ayahCount: 110, juz: 15 },
  { number: 19, name: "مريم", englishName: "Maryam", ayahCount: 98, juz: 16 },
  { number: 20, name: "طه", englishName: "Taa-Haa", ayahCount: 135, juz: 16 },
  { number: 21, name: "الأنبياء", englishName: "Al-Anbiyaa", ayahCount: 112, juz: 17 },
  { number: 22, name: "الحج", englishName: "Al-Hajj", ayahCount: 78, juz: 17 },
  { number: 23, name: "المؤمنون", englishName: "Al-Muminoon", ayahCount: 118, juz: 18 },
  { number: 24, name: "النور", englishName: "An-Noor", ayahCount: 64, juz: 18 },
  { number: 25, name: "الفرقان", englishName: "Al-Furqaan", ayahCount: 77, juz: 18 },
  { number: 26, name: "الشعراء", englishName: "Ash-Shu'araa", ayahCount: 227, juz: 19 },
  { number: 27, name: "النمل", englishName: "An-Naml", ayahCount: 93, juz: 19 },
  { number: 28, name: "القصص", englishName: "Al-Qasas", ayahCount: 88, juz: 20 },
  { number: 29, name: "العنكبوت", englishName: "Al-Ankaboot", ayahCount: 69, juz: 20 },
  { number: 30, name: "الروم", englishName: "Ar-Room", ayahCount: 60, juz: 21 },
  { number: 31, name: "لقمان", englishName: "Luqman", ayahCount: 34, juz: 21 },
  { number: 32, name: "السجدة", englishName: "As-Sajda", ayahCount: 30, juz: 21 },
  { number: 33, name: "الأحزاب", englishName: "Al-Ahzaab", ayahCount: 73, juz: 21 },
  { number: 34, name: "سبأ", englishName: "Saba", ayahCount: 54, juz: 22 },
  { number: 35, name: "فاطر", englishName: "Faatir", ayahCount: 45, juz: 22 },
  { number: 36, name: "يس", englishName: "Yaseen", ayahCount: 83, juz: 22 },
  { number: 37, name: "الصافات", englishName: "As-Saaffaat", ayahCount: 182, juz: 23 },
  { number: 38, name: "ص", englishName: "Saad", ayahCount: 88, juz: 23 },
  { number: 39, name: "الزمر", englishName: "Az-Zumar", ayahCount: 75, juz: 23 },
  { number: 40, name: "غافر", englishName: "Ghafir", ayahCount: 85, juz: 24 },
  { number: 41, name: "فصلت", englishName: "Fussilat", ayahCount: 54, juz: 24 },
  { number: 42, name: "الشورى", englishName: "Ash-Shura", ayahCount: 53, juz: 25 },
  { number: 43, name: "الزخرف", englishName: "Az-Zukhruf", ayahCount: 89, juz: 25 },
  { number: 44, name: "الدخان", englishName: "Ad-Dukhaan", ayahCount: 59, juz: 25 },
  { number: 45, name: "الجاثية", englishName: "Al-Jaathiya", ayahCount: 37, juz: 25 },
  { number: 46, name: "الأحقاف", englishName: "Al-Ahqaf", ayahCount: 35, juz: 26 },
  { number: 47, name: "محمد", englishName: "Muhammad", ayahCount: 38, juz: 26 },
  { number: 48, name: "الفتح", englishName: "Al-Fath", ayahCount: 29, juz: 26 },
  { number: 49, name: "الحجرات", englishName: "Al-Hujuraat", ayahCount: 18, juz: 26 },
  { number: 50, name: "ق", englishName: "Qaaf", ayahCount: 45, juz: 26 },
  { number: 51, name: "الذاريات", englishName: "Adh-Dhaariyat", ayahCount: 60, juz: 26 },
  { number: 52, name: "الطور", englishName: "At-Tur", ayahCount: 49, juz: 27 },
  { number: 53, name: "النجم", englishName: "An-Najm", ayahCount: 62, juz: 27 },
  { number: 54, name: "القمر", englishName: "Al-Qamar", ayahCount: 55, juz: 27 },
  { number: 55, name: "الرحمن", englishName: "Ar-Rahmaan", ayahCount: 78, juz: 27 },
  { number: 56, name: "الواقعة", englishName: "Al-Waaqia", ayahCount: 96, juz: 27 },
  { number: 57, name: "الحديد", englishName: "Al-Hadid", ayahCount: 29, juz: 27 },
  { number: 58, name: "المجادلة", englishName: "Al-Mujadila", ayahCount: 22, juz: 28 },
  { number: 59, name: "الحشر", englishName: "Al-Hashr", ayahCount: 24, juz: 28 },
  { number: 60, name: "الممتحنة", englishName: "Al-Mumtahana", ayahCount: 13, juz: 28 },
  { number: 61, name: "الصف", englishName: "As-Saff", ayahCount: 14, juz: 28 },
  { number: 62, name: "الجمعة", englishName: "Al-Jumu'a", ayahCount: 11, juz: 28 },
  { number: 63, name: "المنافقون", englishName: "Al-Munaafiqoon", ayahCount: 11, juz: 28 },
  { number: 64, name: "التغابن", englishName: "At-Taghaabun", ayahCount: 18, juz: 28 },
  { number: 65, name: "الطلاق", englishName: "At-Talaaq", ayahCount: 12, juz: 28 },
  { number: 66, name: "التحريم", englishName: "At-Tahrim", ayahCount: 12, juz: 28 },
  { number: 67, name: "الملك", englishName: "Al-Mulk", ayahCount: 30, juz: 29 },
  { number: 68, name: "القلم", englishName: "Al-Qalam", ayahCount: 52, juz: 29 },
  { number: 69, name: "الحاقة", englishName: "Al-Haaqqa", ayahCount: 52, juz: 29 },
  { number: 70, name: "المعارج", englishName: "Al-Ma'aarij", ayahCount: 44, juz: 29 },
  { number: 71, name: "نوح", englishName: "Nooh", ayahCount: 28, juz: 29 },
  { number: 72, name: "الجن", englishName: "Al-Jinn", ayahCount: 28, juz: 29 },
  { number: 73, name: "المزمل", englishName: "Al-Muzzammil", ayahCount: 20, juz: 29 },
  { number: 74, name: "المدثر", englishName: "Al-Muddaththir", ayahCount: 56, juz: 29 },
  { number: 75, name: "القيامة", englishName: "Al-Qiyaama", ayahCount: 40, juz: 29 },
  { number: 76, name: "الإنسان", englishName: "Al-Insaan", ayahCount: 31, juz: 29 },
  { number: 77, name: "المرسلات", englishName: "Al-Mursalaat", ayahCount: 50, juz: 29 },
  { number: 78, name: "النبأ", englishName: "An-Naba", ayahCount: 40, juz: 30 },
  { number: 79, name: "النازعات", englishName: "An-Naazi'aat", ayahCount: 46, juz: 30 },
  { number: 80, name: "عبس", englishName: "Abasa", ayahCount: 42, juz: 30 },
  { number: 81, name: "التكوير", englishName: "At-Takwir", ayahCount: 29, juz: 30 },
  { number: 82, name: "الانفطار", englishName: "Al-Infitaar", ayahCount: 19, juz: 30 },
  { number: 83, name: "المطففين", englishName: "Al-Mutaffifin", ayahCount: 36, juz: 30 },
  { number: 84, name: "الانشقاق", englishName: "Al-Inshiqaaq", ayahCount: 25, juz: 30 },
  { number: 85, name: "البروج", englishName: "Al-Burooj", ayahCount: 22, juz: 30 },
  { number: 86, name: "الطارق", englishName: "At-Taariq", ayahCount: 17, juz: 30 },
  { number: 87, name: "الأعلى", englishName: "Al-A'la", ayahCount: 19, juz: 30 },
  { number: 88, name: "الغاشية", englishName: "Al-Ghaashiya", ayahCount: 26, juz: 30 },
  { number: 89, name: "الفجر", englishName: "Al-Fajr", ayahCount: 30, juz: 30 },
  { number: 90, name: "البلد", englishName: "Al-Balad", ayahCount: 20, juz: 30 },
  { number: 91, name: "الشمس", englishName: "Ash-Shams", ayahCount: 15, juz: 30 },
  { number: 92, name: "الليل", englishName: "Al-Lail", ayahCount: 21, juz: 30 },
  { number: 93, name: "الضحى", englishName: "Ad-Dhuhaa", ayahCount: 11, juz: 30 },
  { number: 94, name: "الشرح", englishName: "Ash-Sharh", ayahCount: 8, juz: 30 },
  { number: 95, name: "التين", englishName: "At-Tin", ayahCount: 8, juz: 30 },
  { number: 96, name: "العلق", englishName: "Al-Alaq", ayahCount: 19, juz: 30 },
  { number: 97, name: "القدر", englishName: "Al-Qadr", ayahCount: 5, juz: 30 },
  { number: 98, name: "البينة", englishName: "Al-Bayyina", ayahCount: 8, juz: 30 },
  { number: 99, name: "الزلزلة", englishName: "Az-Zalzala", ayahCount: 8, juz: 30 },
  { number: 100, name: "العاديات", englishName: "Al-Aadiyaat", ayahCount: 11, juz: 30 },
  { number: 101, name: "القارعة", englishName: "Al-Qaari'a", ayahCount: 11, juz: 30 },
  { number: 102, name: "التكاثر", englishName: "At-Takaathur", ayahCount: 8, juz: 30 },
  { number: 103, name: "العصر", englishName: "Al-Asr", ayahCount: 3, juz: 30 },
  { number: 104, name: "الهمزة", englishName: "Al-Humaza", ayahCount: 9, juz: 30 },
  { number: 105, name: "الفيل", englishName: "Al-Fil", ayahCount: 5, juz: 30 },
  { number: 106, name: "قريش", englishName: "Quraish", ayahCount: 4, juz: 30 },
  { number: 107, name: "الماعون", englishName: "Al-Maa'un", ayahCount: 7, juz: 30 },
  { number: 108, name: "الكوثر", englishName: "Al-Kawthar", ayahCount: 3, juz: 30 },
  { number: 109, name: "الكافرون", englishName: "Al-Kaafiroon", ayahCount: 6, juz: 30 },
  { number: 110, name: "النصر", englishName: "An-Nasr", ayahCount: 3, juz: 30 },
  { number: 111, name: "المسد", englishName: "Al-Masad", ayahCount: 5, juz: 30 },
  { number: 112, name: "الإخلاص", englishName: "Al-Ikhlaas", ayahCount: 4, juz: 30 },
  { number: 113, name: "الفلق", englishName: "Al-Falaq", ayahCount: 5, juz: 30 },
  { number: 114, name: "الناس", englishName: "An-Naas", ayahCount: 6, juz: 30 },
];

export function getAyahCount(surahNumber: number): number {
  return SURAH_DATA[surahNumber - 1]?.ayahCount ?? 0;
}

export function getNextAyah(surahNum: number, ayahNum: number): { surah: number; ayah: number } | null {
  const count = getAyahCount(surahNum);
  if (ayahNum < count) return { surah: surahNum, ayah: ayahNum + 1 };
  if (surahNum < 114) return { surah: surahNum + 1, ayah: 1 };
  return null;
}

export function isRangeEnd(
  currentSurah: number, currentAyah: number,
  endSurah: number, endAyah: number
): boolean {
  return currentSurah === endSurah && currentAyah === endAyah;
}

export const JUZ_STARTS: { juz: number; surah: number; ayah: number; label: string }[] = [
  { juz: 1, surah: 1, ayah: 1, label: "Juz 1" },
  { juz: 2, surah: 2, ayah: 142, label: "Juz 2" },
  { juz: 3, surah: 2, ayah: 253, label: "Juz 3" },
  { juz: 4, surah: 3, ayah: 92, label: "Juz 4" },
  { juz: 5, surah: 4, ayah: 24, label: "Juz 5" },
  { juz: 6, surah: 4, ayah: 148, label: "Juz 6" },
  { juz: 7, surah: 5, ayah: 82, label: "Juz 7" },
  { juz: 8, surah: 6, ayah: 111, label: "Juz 8" },
  { juz: 9, surah: 7, ayah: 87, label: "Juz 9" },
  { juz: 10, surah: 8, ayah: 41, label: "Juz 10" },
  { juz: 11, surah: 9, ayah: 93, label: "Juz 11" },
  { juz: 12, surah: 11, ayah: 6, label: "Juz 12" },
  { juz: 13, surah: 12, ayah: 53, label: "Juz 13" },
  { juz: 14, surah: 15, ayah: 1, label: "Juz 14" },
  { juz: 15, surah: 17, ayah: 1, label: "Juz 15" },
  { juz: 16, surah: 18, ayah: 75, label: "Juz 16" },
  { juz: 17, surah: 21, ayah: 1, label: "Juz 17" },
  { juz: 18, surah: 23, ayah: 1, label: "Juz 18" },
  { juz: 19, surah: 25, ayah: 21, label: "Juz 19" },
  { juz: 20, surah: 27, ayah: 56, label: "Juz 20" },
  { juz: 21, surah: 29, ayah: 46, label: "Juz 21" },
  { juz: 22, surah: 33, ayah: 31, label: "Juz 22" },
  { juz: 23, surah: 36, ayah: 28, label: "Juz 23" },
  { juz: 24, surah: 39, ayah: 32, label: "Juz 24" },
  { juz: 25, surah: 41, ayah: 47, label: "Juz 25" },
  { juz: 26, surah: 46, ayah: 1, label: "Juz 26" },
  { juz: 27, surah: 51, ayah: 31, label: "Juz 27" },
  { juz: 28, surah: 58, ayah: 1, label: "Juz 28" },
  { juz: 29, surah: 67, ayah: 1, label: "Juz 29" },
  { juz: 30, surah: 78, ayah: 1, label: "Juz 30" },
];

function compareAyahRef(a: { surah: number; ayah: number }, b: { surah: number; ayah: number }) {
  if (a.surah !== b.surah) return a.surah - b.surah;
  return a.ayah - b.ayah;
}

export function getJuzAyahs(juz: number): AyahRef[] {
  const start = JUZ_STARTS.find((j) => j.juz === juz);
  if (!start) return [];
  const nextStart = JUZ_STARTS.find((j) => j.juz === juz + 1);
  const ayahs: AyahRef[] = [];

  for (const surah of SURAH_DATA) {
    for (let ayah = 1; ayah <= surah.ayahCount; ayah++) {
      const ref = { surah: surah.number, ayah };
      if (compareAyahRef(ref, { surah: start.surah, ayah: start.ayah }) < 0) continue;
      if (nextStart && compareAyahRef(ref, { surah: nextStart.surah, ayah: nextStart.ayah }) >= 0) {
        return ayahs;
      }
      ayahs.push({ surahNumber: surah.number, surahName: surah.englishName, ayahNumber: ayah });
    }
  }

  return ayahs;
}

export function getJuzForAyah(surahNumber: number, ayahNumber: number): number {
  let current = 1;
  for (const start of JUZ_STARTS) {
    if (compareAyahRef({ surah: surahNumber, ayah: ayahNumber }, { surah: start.surah, ayah: start.ayah }) >= 0) {
      current = start.juz;
    } else {
      break;
    }
  }
  return current;
}

export function getWeeklyGoalAyahsFrom(
  startSurahNumber: number,
  startAyahNumber: number,
  count: number,
  target: { path: "surah"; juz?: never } | { path: "juz"; juz: number }
): AyahRef[] {
  const source = target.path === "juz"
    ? getJuzAyahs(target.juz)
    : (() => {
        const surah = SURAH_DATA.find((s) => s.number === startSurahNumber);
        if (!surah) return [];
        return Array.from({ length: surah.ayahCount }, (_, i) => ({
          surahNumber: surah.number,
          surahName: surah.englishName,
          ayahNumber: i + 1,
        }));
      })();
  const startIndex = source.findIndex(
    (a) => a.surahNumber === startSurahNumber && a.ayahNumber === startAyahNumber
  );
  if (startIndex < 0 || count <= 0) return [];
  return source.slice(startIndex, startIndex + count);
}
