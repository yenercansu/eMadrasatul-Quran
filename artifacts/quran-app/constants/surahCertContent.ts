export interface SurahCertContent {
  hadith: string;
  source: string;
  dua: string;
  duaEn: string;
}

const FALLBACK: SurahCertContent = {
  hadith: "The best among you are those who learn the Quran and teach it.",
  source: "SAHIH AL-BUKHARI",
  dua: "بَارَكَ اللَّهُ فِيكَ",
  duaEn: "May this surah be light in your heart and intercession on your Day.",
};

const CONTENT: Partial<Record<number, SurahCertContent>> = {
  1: {
    hadith: "Al-Faatiha is the Mother of the Quran, the seven oft-repeated verses, and the Magnificent Quran given to me.",
    source: "SAHIH AL-BUKHARI",
    dua: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
    duaEn: "All praise is due to Allah, Lord of all the worlds.",
  },
  2: {
    hadith: "Recite Al-Baqara, for reciting it brings blessings, leaving it brings regret, and the sorcerers cannot withstand it.",
    source: "SAHIH MUSLIM",
    dua: "بَارَكَ اللَّهُ فِيكَ",
    duaEn: "May this surah be a fortress and light in your home.",
  },
  3: {
    hadith: "Recite the two lights: Al-Baqara and Aal-i-Imraan, for they will come as two clouds interceding for those who recited them.",
    source: "SAHIH MUSLIM",
    dua: "بَارَكَ اللَّهُ فِيكَ",
    duaEn: "May this surah illuminate your path on the Day of Arising.",
  },
  18: {
    hadith: "Whoever memorizes ten ayahs from the beginning of Surah Al-Kahf will be protected from the Dajjal.",
    source: "SAHIH MUSLIM",
    dua: "بَارَكَ اللَّهُ فِيكَ",
    duaEn: "May its light guide you through every trial.",
  },
  36: {
    hadith: "Everything has a heart, and the heart of the Quran is Surah Ya-Sin.",
    source: "TIRMIDHI",
    dua: "بَارَكَ اللَّهُ فِيكَ",
    duaEn: "May the heart of the Quran dwell in your heart.",
  },
  55: {
    hadith: "Which of the favors of your Lord will you deny?",
    source: "QURAN · AL-RAHMAN",
    dua: "بَارَكَ اللَّهُ فِيكَ",
    duaEn: "May gratitude be ever-present in your heart.",
  },
  56: {
    hadith: "Whoever recites Surah Al-Waqi'ah every night, poverty will never touch him.",
    source: "BAYHAQI",
    dua: "بَارَكَ اللَّهُ فِيكَ",
    duaEn: "May this surah be your companion and provision.",
  },
  59: {
    hadith: "Whoever recites the last three ayahs of Surah Al-Hashr in the morning, Allah appoints seventy thousand angels to pray for his forgiveness until evening.",
    source: "TIRMIDHI",
    dua: "بَارَكَ اللَّهُ فِيكَ",
    duaEn: "May the angels pray for your forgiveness this day and always.",
  },
  67: {
    hadith: "There is a surah of thirty ayahs which will intercede for its companion until he is forgiven — it is Tabaarak Alladhi biyadihil mulk.",
    source: "ABU DAWUD · TIRMIDHI",
    dua: "بَارَكَ اللَّهُ فِيكَ",
    duaEn: "May Al-Mulk be your intercessor and your shield.",
  },
  112: {
    hadith: "By the One in Whose Hand is my soul, it is equivalent to one-third of the Quran.",
    source: "SAHIH AL-BUKHARI",
    dua: "قُلْ هُوَ اللَّهُ أَحَدٌ",
    duaEn: "May sincerity dwell in your heart as this surah is on your tongue.",
  },
  113: {
    hadith: "The Prophet ﷺ used to seek protection with Al-Falaq and An-Nas before sleeping, and he commanded us to do so.",
    source: "SUNAN AN-NASAI",
    dua: "بَارَكَ اللَّهُ فِيكَ",
    duaEn: "May its recitation be your shield and your refuge.",
  },
  114: {
    hadith: "The Prophet ﷺ used to seek protection with Al-Falaq and An-Nas before sleeping, and he commanded us to do so.",
    source: "SUNAN AN-NASAI",
    dua: "بَارَكَ اللَّهُ فِيكَ",
    duaEn: "May its recitation be your shield and your refuge.",
  },
};

export function getSurahCertContent(surahNumber: number): SurahCertContent {
  return CONTENT[surahNumber] ?? FALLBACK;
}
