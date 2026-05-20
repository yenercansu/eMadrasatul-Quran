export type CollectionDifficulty = "Beginner" | "Intermediate" | "Advanced";

export type CollectionSection = "sunnah-collections" | "hifz-packs";

export type CollectionGroup =
  | "essentials"
  | "our-recommendations"
  | "surahs"
  | "juz";

export type CollectionFilter = "all" | CollectionGroup;

export type CollectionSourceType =
  | "builtIn"
  | "teacherCurated"
  | "institutionCurated"
  | "seasonal";

export interface AyahRange {
  surahNumber: number;
  startAyah: number;
  endAyah: number;
}

export interface MemorizationCollection {
  id: string;
  title: string;
  localizedTitle?: Record<string, string>;
  aliases: string[];
  section: CollectionSection;
  group: CollectionGroup;
  description: string;
  ayahRanges: AyahRange[];
  ayahCount: number;
  difficulty: CollectionDifficulty;
  estimatedTimeMin: number;
  tags: string[];
  ctaLabel: string;
  recommendedFor: string[];
  sourceType: CollectionSourceType;
  enabled: boolean;
}

// ── Section display config ──────────────────────────────────────────────────
export const SECTION_CONFIG: Record<CollectionSection, { title: string; order: number }> = {
  "sunnah-collections": { title: "Sunnah Collections", order: 0 },
  "hifz-packs": { title: "Hifz Packs", order: 1 },
};

// ── Group display config ────────────────────────────────────────────────────
export const GROUP_CONFIG: Record<
  CollectionGroup,
  { label: string; section: CollectionSection; order: number }
> = {
  "essentials":         { label: "ESSENTIALS",          section: "sunnah-collections", order: 0 },
  "our-recommendations":{ label: "OUR RECOMMENDATIONS", section: "sunnah-collections", order: 1 },
  "surahs":             { label: "SURAHS",               section: "hifz-packs",         order: 0 },
  "juz":                { label: "JUZ",                  section: "hifz-packs",         order: 1 },
};

// ── Filter chips ────────────────────────────────────────────────────────────
export const COLLECTION_FILTER_CHIPS: ReadonlyArray<{ key: CollectionFilter; label: string }> = [
  { key: "all",               label: "All" },
  { key: "essentials",        label: "Essentials" },
  { key: "our-recommendations", label: "Our Recommendations" },
  { key: "surahs",            label: "Surahs" },
  { key: "juz",               label: "Juz" },
];

// ── Collections ─────────────────────────────────────────────────────────────
export const MEMORIZATION_COLLECTIONS: ReadonlyArray<MemorizationCollection> = [

  // ── Sunnah Collections › Essentials ──────────────────────────────────────

  {
    id: "ayatul-kursi",
    title: "Ayatul Kursi",
    localizedTitle: { tr: "Ayet'el Kürsi", ar: "آية الكرسي" },
    aliases: ["Ayetel Kürsi", "Ayat al-Kursi", "Throne Verse"],
    section: "sunnah-collections",
    group: "essentials",
    description:
      "The greatest verse in the Quran. Recited after every salah and before sleep for lasting protection.",
    ayahRanges: [{ surahNumber: 2, startAyah: 255, endAyah: 255 }],
    ayahCount: 1,
    difficulty: "Beginner",
    estimatedTimeMin: 5,
    tags: ["protection", "salah", "daily", "essential"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "reverts", "daily-practice"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "amanar-rasulu",
    title: "Āmanar Rasūlu",
    localizedTitle: { tr: "Amenerrasülü", ar: "آمَنَ الرَّسُولُ" },
    aliases: ["Amenerrasulo", "Amenerrasulu", "Amenarrasulo", "Amanar Rasulu", "Baqarah 285-286"],
    section: "sunnah-collections",
    group: "essentials",
    description:
      "The closing verses of Al-Baqarah. A shield for the believer — the Prophet ﷺ said whoever recites them at night will be sufficed.",
    ayahRanges: [{ surahNumber: 2, startAyah: 285, endAyah: 286 }],
    ayahCount: 2,
    difficulty: "Beginner",
    estimatedTimeMin: 10,
    tags: ["protection", "daily", "night", "essential"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "reverts", "daily-practice"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "rabbana-atina",
    title: "Rabbanā Ātinā",
    localizedTitle: { tr: "Rabbena Atina", ar: "رَبَّنَا آتِنَا" },
    aliases: ["Rabbana Atina", "Rabbena Atina", "Baqarah 201"],
    section: "sunnah-collections",
    group: "essentials",
    description:
      "A concise dua for goodness in this life and the hereafter. One of the most-recited supplications in salah.",
    ayahRanges: [{ surahNumber: 2, startAyah: 201, endAyah: 201 }],
    ayahCount: 1,
    difficulty: "Beginner",
    estimatedTimeMin: 3,
    tags: ["dua", "salah", "daily"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "children"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "hasbunallah",
    title: "Hasbunallāhu wa Ni'mal Wakīl",
    localizedTitle: { tr: "Hasbunallah ve Ni'mel Vekil", ar: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ" },
    aliases: ["Hasbunallah", "Hasbunallahu wa Ni'mal Wakeel", "Aal-i-Imran 173"],
    section: "sunnah-collections",
    group: "essentials",
    description:
      '"Allah is sufficient for us, and He is the best Disposer of affairs." Recited in times of hardship and reliance on Allah.',
    ayahRanges: [{ surahNumber: 3, startAyah: 173, endAyah: 173 }],
    ayahCount: 1,
    difficulty: "Beginner",
    estimatedTimeMin: 2,
    tags: ["tawakkul", "dhikr", "protection"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "reverts"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "four-quls",
    title: "Four Quls",
    localizedTitle: { tr: "Dört Kul", ar: "الأقل الأربع" },
    aliases: ["Al-Kafirun", "Al-Ikhlas", "Al-Falaq", "An-Nas", "4 Quls", "Kul Sureleri"],
    section: "sunnah-collections",
    group: "essentials",
    description:
      "Surah Al-Kafirun, Al-Ikhlas, Al-Falaq, and An-Nas. Collectively offer complete daily protection when recited morning and evening.",
    ayahRanges: [
      { surahNumber: 109, startAyah: 1, endAyah: 6 },
      { surahNumber: 112, startAyah: 1, endAyah: 4 },
      { surahNumber: 113, startAyah: 1, endAyah: 5 },
      { surahNumber: 114, startAyah: 1, endAyah: 6 },
    ],
    ayahCount: 21,
    difficulty: "Beginner",
    estimatedTimeMin: 15,
    tags: ["protection", "daily", "essential", "short-surahs"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "reverts", "children"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "last-3-hashr",
    title: "Last 3 Ayahs of Al-Hashr",
    localizedTitle: { tr: "Haşr'ın Son 3 Ayeti", ar: "خواتيم سورة الحشر" },
    aliases: ["Last ayahs of Hashr", "Hashr 22-24", "Huwa Allahu"],
    section: "sunnah-collections",
    group: "essentials",
    description:
      "Powerful verses describing the divine Names of Allah. Recited three times in the morning for protection all day.",
    ayahRanges: [{ surahNumber: 59, startAyah: 22, endAyah: 24 }],
    ayahCount: 3,
    difficulty: "Intermediate",
    estimatedTimeMin: 20,
    tags: ["protection", "morning", "evening", "adhkar"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["intermediate", "daily-practice"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "first-10-kahf",
    title: "First 10 Ayahs of Al-Kahf",
    localizedTitle: { tr: "Kehf'in İlk 10 Ayeti", ar: "أوائل الكهف" },
    aliases: ["First 10 Kahf", "Kahf 1-10", "Kehf Başı"],
    section: "sunnah-collections",
    group: "essentials",
    description:
      "Protection from the trials of Ad-Dajjal. The Prophet ﷺ recommended reciting them every Friday.",
    ayahRanges: [{ surahNumber: 18, startAyah: 1, endAyah: 10 }],
    ayahCount: 10,
    difficulty: "Intermediate",
    estimatedTimeMin: 45,
    tags: ["protection", "friday", "kahf"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["intermediate", "friday-routine"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "last-10-kahf",
    title: "Last 10 Ayahs of Al-Kahf",
    localizedTitle: { tr: "Kehf'in Son 10 Ayeti", ar: "خواتيم الكهف" },
    aliases: ["Last 10 Kahf", "Kahf 101-110", "Kehf Sonu"],
    section: "sunnah-collections",
    group: "essentials",
    description:
      "Completes the Friday protection with the powerful closing of Surah Al-Kahf.",
    ayahRanges: [{ surahNumber: 18, startAyah: 101, endAyah: 110 }],
    ayahCount: 10,
    difficulty: "Intermediate",
    estimatedTimeMin: 45,
    tags: ["protection", "friday", "kahf"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["intermediate", "friday-routine"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "rabbi-shrah-li",
    title: "Rabbi Shraḥ Lī Ṣadrī",
    localizedTitle: { tr: "Rabbi Şrahlî Sadrî", ar: "رَبِّ اشْرَحْ لِي صَدْرِي" },
    aliases: ["Rabbi Shrahli Sadri", "Rabbishrahli Sadri", "Musa dua", "Taha 25-28"],
    section: "sunnah-collections",
    group: "essentials",
    description:
      "Prophet Musa's ﷺ dua for an open heart and ease of speech. Ideal before any important task or public speaking.",
    ayahRanges: [{ surahNumber: 20, startAyah: 25, endAyah: 28 }],
    ayahCount: 4,
    difficulty: "Beginner",
    estimatedTimeMin: 8,
    tags: ["dua", "ease", "speech", "musa"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "reverts", "students"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "rabbi-zidni-ilma",
    title: "Rabbi Zidnī 'Ilmā",
    localizedTitle: { tr: "Rabbi Zidni İlmen", ar: "رَّبِّ زِدْنِي عِلْمًا" },
    aliases: ["Rabbi Zidni Ilma", "Rabbi Zidni Ilman", "Taha 114"],
    section: "sunnah-collections",
    group: "essentials",
    description:
      '"My Lord, increase me in knowledge." A short, timeless dua for every seeker of knowledge.',
    ayahRanges: [{ surahNumber: 20, startAyah: 114, endAyah: 114 }],
    ayahCount: 1,
    difficulty: "Beginner",
    estimatedTimeMin: 2,
    tags: ["dua", "knowledge", "students"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "children", "students"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "la-ilaha-illa-anta",
    title: "Lā Ilāha Illā Anta Subḥānaka",
    localizedTitle: { tr: "La İlahe İlla Ente Sübhaneke", ar: "لَّا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ" },
    aliases: ["La Ilaha Illa Anta Subhanaka", "Yunus dua", "Dhun-Nun dua", "Anbiya 87"],
    section: "sunnah-collections",
    group: "essentials",
    description:
      "Prophet Yunus's ﷺ dua from within the whale. Recited in moments of distress — Allah answered it immediately.",
    ayahRanges: [{ surahNumber: 21, startAyah: 87, endAyah: 87 }],
    ayahCount: 1,
    difficulty: "Beginner",
    estimatedTimeMin: 3,
    tags: ["dua", "distress", "yunus", "hardship"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "reverts"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "rabbi-inni-lima",
    title: "Rabbi Innī Limā Anzalta",
    localizedTitle: { tr: "Rabbi İnni Lima Enzelte", ar: "رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ" },
    aliases: ["Rabbi Inni Lima Anzalta", "Musa dua of need", "Qasas 24"],
    section: "sunnah-collections",
    group: "essentials",
    description:
      "Prophet Musa's humble supplication in a moment of need. A dua of complete reliance on Allah's provision.",
    ayahRanges: [{ surahNumber: 28, startAyah: 24, endAyah: 24 }],
    ayahCount: 1,
    difficulty: "Beginner",
    estimatedTimeMin: 3,
    tags: ["dua", "provision", "need", "musa"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "reverts"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "rabbana-hablana",
    title: "Rabbanā Hab Lanā",
    localizedTitle: { tr: "Rabbena Heb Lena", ar: "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا" },
    aliases: ["Rabbana Hablana Min Azwajina", "Furqan 74", "family dua"],
    section: "sunnah-collections",
    group: "essentials",
    description:
      "A dua for righteous spouses and children who bring joy to the heart. Recited for family blessings.",
    ayahRanges: [{ surahNumber: 25, startAyah: 74, endAyah: 74 }],
    ayahCount: 1,
    difficulty: "Beginner",
    estimatedTimeMin: 3,
    tags: ["dua", "family", "marriage", "children"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "reverts"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "inna-lillahi",
    title: "Innā Lillāhi wa Innā Ilayhi Rāji'ūn",
    localizedTitle: { tr: "İnnallahi ve İnna İleyhi Raciun", ar: "إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ" },
    aliases: ["Inna Lillahi", "Innalillahi", "Innalillahiwainnailayhirajiun", "Istirja", "استرجاع", "Baqarah 156"],
    section: "sunnah-collections",
    group: "essentials",
    description:
      '"Indeed, we belong to Allah and to Him we shall return." Recited in moments of loss, hardship, and grief — a profound surrender to Allah\'s decree.',
    ayahRanges: [{ surahNumber: 2, startAyah: 156, endAyah: 156 }],
    ayahCount: 1,
    difficulty: "Beginner",
    estimatedTimeMin: 2,
    tags: ["inna-lillahi", "loss", "grief", "hardship", "istirja"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "reverts", "emotional-support"],
    sourceType: "builtIn",
    enabled: true,
  },

  // ── Sunnah Collections › Our Recommendations ─────────────────────────────

  {
    id: "ayahs-on-patience",
    title: "Ayahs on Patience",
    localizedTitle: { tr: "Sabır Ayetleri", ar: "آيات الصبر" },
    aliases: ["patience ayahs", "sabr", "sabır ayetleri"],
    section: "sunnah-collections",
    group: "our-recommendations",
    description:
      "Core ayahs on steadfastness and the great reward Allah promises to those who remain patient.",
    ayahRanges: [
      { surahNumber: 2, startAyah: 153, endAyah: 153 },
      { surahNumber: 2, startAyah: 155, endAyah: 157 },
      { surahNumber: 3, startAyah: 200, endAyah: 200 },
      { surahNumber: 39, startAyah: 10, endAyah: 10 },
    ],
    ayahCount: 6,
    difficulty: "Beginner",
    estimatedTimeMin: 25,
    tags: ["sabr", "patience", "hardship", "spiritual"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "reverts", "emotional-support"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "ayahs-on-tawakkul",
    title: "Ayahs on Tawakkul",
    localizedTitle: { tr: "Tevekkül Ayetleri", ar: "آيات التوكل" },
    aliases: ["tawakkul", "trust in Allah", "tevekkül ayetleri"],
    section: "sunnah-collections",
    group: "our-recommendations",
    description:
      "Verses on placing complete reliance in Allah — especially powerful in times of uncertainty and anxiety.",
    ayahRanges: [
      { surahNumber: 3, startAyah: 159, endAyah: 159 },
      { surahNumber: 3, startAyah: 173, endAyah: 173 },
      { surahNumber: 65, startAyah: 3, endAyah: 3 },
    ],
    ayahCount: 3,
    difficulty: "Beginner",
    estimatedTimeMin: 12,
    tags: ["tawakkul", "trust", "reliance", "spiritual"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "reverts", "emotional-support"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "ayahs-on-rizq",
    title: "Ayahs on Rizq",
    localizedTitle: { tr: "Rızık Ayetleri", ar: "آيات الرزق" },
    aliases: ["rizq", "provision", "sustenance", "rızık ayetleri"],
    section: "sunnah-collections",
    group: "our-recommendations",
    description:
      "Verses affirming that Allah is the All-Provider. Recited for barakah and contentment in one's sustenance.",
    ayahRanges: [
      { surahNumber: 11, startAyah: 6, endAyah: 6 },
      { surahNumber: 51, startAyah: 58, endAyah: 58 },
      { surahNumber: 65, startAyah: 3, endAyah: 3 },
    ],
    ayahCount: 3,
    difficulty: "Beginner",
    estimatedTimeMin: 12,
    tags: ["rizq", "provision", "tawakkul", "spiritual"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "reverts", "emotional-support"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "ayahs-on-peace",
    title: "Ayahs on Peace of Heart",
    localizedTitle: { tr: "Kalp Huzuru Ayetleri", ar: "آيات الطمأنينة" },
    aliases: ["anxiety", "peace of heart", "calm", "itminan", "tatmain", "kalp huzuru"],
    section: "sunnah-collections",
    group: "our-recommendations",
    description:
      'Grounding ayahs for moments of worry. "Verily, in the remembrance of Allah do hearts find rest."',
    ayahRanges: [
      { surahNumber: 13, startAyah: 28, endAyah: 28 },
      { surahNumber: 94, startAyah: 5, endAyah: 6 },
    ],
    ayahCount: 3,
    difficulty: "Beginner",
    estimatedTimeMin: 10,
    tags: ["peace", "anxiety", "calm", "spiritual", "heart"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "reverts", "emotional-support"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "morning-adhkar",
    title: "Morning Adhkar",
    localizedTitle: { tr: "Sabah Duaları", ar: "أذكار الصباح" },
    aliases: ["morning remembrance", "sabah duaları", "sabah adhkar", "morning duas"],
    section: "sunnah-collections",
    group: "our-recommendations",
    description:
      "Essential ayahs for the morning adhkar routine. Read after Fajr for complete daily protection.",
    ayahRanges: [
      { surahNumber: 2, startAyah: 255, endAyah: 255 },
      { surahNumber: 59, startAyah: 22, endAyah: 24 },
      { surahNumber: 112, startAyah: 1, endAyah: 4 },
      { surahNumber: 113, startAyah: 1, endAyah: 5 },
      { surahNumber: 114, startAyah: 1, endAyah: 6 },
    ],
    ayahCount: 19,
    difficulty: "Beginner",
    estimatedTimeMin: 15,
    tags: ["morning", "adhkar", "protection", "daily"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "daily-practice"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "evening-adhkar",
    title: "Evening Adhkar",
    localizedTitle: { tr: "Akşam Duaları", ar: "أذكار المساء" },
    aliases: ["evening remembrance", "aksam duaları", "evening duas", "night adhkar"],
    section: "sunnah-collections",
    group: "our-recommendations",
    description:
      "Ayahs for the evening adhkar routine. Read after Asr to seal the day with remembrance and protection.",
    ayahRanges: [
      { surahNumber: 2, startAyah: 255, endAyah: 255 },
      { surahNumber: 112, startAyah: 1, endAyah: 4 },
      { surahNumber: 113, startAyah: 1, endAyah: 5 },
      { surahNumber: 114, startAyah: 1, endAyah: 6 },
    ],
    ayahCount: 15,
    difficulty: "Beginner",
    estimatedTimeMin: 12,
    tags: ["evening", "adhkar", "protection", "night"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "daily-practice"],
    sourceType: "builtIn",
    enabled: true,
  },

  // ── Hifz Packs › Surahs ──────────────────────────────────────────────────

  {
    id: "surah-mulk",
    title: "Surah Al-Mulk",
    localizedTitle: { tr: "Mülk Suresi", ar: "سورة الملك" },
    aliases: ["Surah Mulk", "Tabarak", "Mulk Suresi", "Al-Mulk"],
    section: "hifz-packs",
    group: "surahs",
    description:
      '"The Sovereignty" — intercedes for its reciter in the grave. The Prophet ﷺ never slept without reciting it.',
    ayahRanges: [{ surahNumber: 67, startAyah: 1, endAyah: 30 }],
    ayahCount: 30,
    difficulty: "Intermediate",
    estimatedTimeMin: 120,
    tags: ["protection", "night", "grave", "intercession"],
    ctaLabel: "Begin Journey",
    recommendedFor: ["intermediate", "nightly-routine"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "surah-duha",
    title: "Surah Ad-Duḥā",
    localizedTitle: { tr: "Duha Suresi", ar: "سورة الضحى" },
    aliases: ["Duha", "Ad-Duha", "Duha Suresi", "The Morning Hours"],
    section: "hifz-packs",
    group: "surahs",
    description:
      'A profound message of comfort. "Your Lord has not abandoned you." Often memorized first by those seeking hope.',
    ayahRanges: [{ surahNumber: 93, startAyah: 1, endAyah: 11 }],
    ayahCount: 11,
    difficulty: "Beginner",
    estimatedTimeMin: 30,
    tags: ["full-surah", "hope", "comfort", "short"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "intermediate"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "surah-inshirah",
    title: "Surah Ash-Sharḥ",
    localizedTitle: { tr: "İnşirah Suresi", ar: "سورة الشرح" },
    aliases: ["Inshirah", "Ash-Sharh", "Alam Nashrah", "İnşirah Suresi", "The Relief"],
    section: "hifz-packs",
    group: "surahs",
    description:
      '"Did We not expand your chest?" — 8 short ayahs of immense spiritual comfort and promise.',
    ayahRanges: [{ surahNumber: 94, startAyah: 1, endAyah: 8 }],
    ayahCount: 8,
    difficulty: "Beginner",
    estimatedTimeMin: 20,
    tags: ["full-surah", "hope", "ease", "short"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "reverts", "children"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "surah-yasin",
    title: "Surah Yā-Sīn",
    localizedTitle: { tr: "Yasin Suresi", ar: "سورة يس" },
    aliases: ["Yasin", "Ya-Sin", "Surah Yaseen", "Yasin Suresi"],
    section: "hifz-packs",
    group: "surahs",
    description:
      '"The Heart of the Quran." Recited on Fridays, for the dying, and for abundant barakah in one\'s affairs.',
    ayahRanges: [{ surahNumber: 36, startAyah: 1, endAyah: 83 }],
    ayahCount: 83,
    difficulty: "Advanced",
    estimatedTimeMin: 480,
    tags: ["full-surah", "friday", "heart-of-quran"],
    ctaLabel: "Begin Journey",
    recommendedFor: ["advanced", "dedicated-learners"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "surah-rahman",
    title: "Surah Ar-Raḥmān",
    localizedTitle: { tr: "Rahman Suresi", ar: "سورة الرحمن" },
    aliases: ["Rahman", "Ar-Rahman", "Rahman Suresi"],
    section: "hifz-packs",
    group: "surahs",
    description:
      '"The Most Merciful" — celebrated for its rhythmic beauty and its repeated reminder of Allah\'s countless blessings.',
    ayahRanges: [{ surahNumber: 55, startAyah: 1, endAyah: 78 }],
    ayahCount: 78,
    difficulty: "Intermediate",
    estimatedTimeMin: 360,
    tags: ["full-surah", "beauty", "blessings"],
    ctaLabel: "Begin Journey",
    recommendedFor: ["intermediate", "advanced"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "surah-waqiah",
    title: "Surah Al-Wāqi'ah",
    localizedTitle: { tr: "Vakıa Suresi", ar: "سورة الواقعة" },
    aliases: ["Waqiah", "Vakıa", "Al-Waqiah", "Vakıa Suresi"],
    section: "hifz-packs",
    group: "surahs",
    description:
      '"The Inevitable Event" — traditionally recited every night for protection from poverty and increase in rizq.',
    ayahRanges: [{ surahNumber: 56, startAyah: 1, endAyah: 96 }],
    ayahCount: 96,
    difficulty: "Advanced",
    estimatedTimeMin: 480,
    tags: ["full-surah", "rizq", "evening"],
    ctaLabel: "Begin Journey",
    recommendedFor: ["advanced", "dedicated-learners"],
    sourceType: "builtIn",
    enabled: true,
  },

  // ── Hifz Packs › Juz ─────────────────────────────────────────────────────

  {
    id: "juz-30-amma",
    title: "Juz 30 — Amma",
    localizedTitle: { tr: "Amme Cüzü", ar: "جزء عم" },
    aliases: ["Amma", "Juz Amma", "Amme Cuzu", "30. Cüz", "Juz 30"],
    section: "hifz-packs",
    group: "juz",
    description:
      "The most commonly memorized Juz — 37 short surahs, from An-Naba to An-Nas. The foundation of every hifz journey.",
    ayahRanges: [
      { surahNumber: 78,  startAyah: 1, endAyah: 40 },
      { surahNumber: 79,  startAyah: 1, endAyah: 46 },
      { surahNumber: 80,  startAyah: 1, endAyah: 42 },
      { surahNumber: 81,  startAyah: 1, endAyah: 29 },
      { surahNumber: 82,  startAyah: 1, endAyah: 19 },
      { surahNumber: 83,  startAyah: 1, endAyah: 36 },
      { surahNumber: 84,  startAyah: 1, endAyah: 25 },
      { surahNumber: 85,  startAyah: 1, endAyah: 22 },
      { surahNumber: 86,  startAyah: 1, endAyah: 17 },
      { surahNumber: 87,  startAyah: 1, endAyah: 19 },
      { surahNumber: 88,  startAyah: 1, endAyah: 26 },
      { surahNumber: 89,  startAyah: 1, endAyah: 30 },
      { surahNumber: 90,  startAyah: 1, endAyah: 20 },
      { surahNumber: 91,  startAyah: 1, endAyah: 15 },
      { surahNumber: 92,  startAyah: 1, endAyah: 21 },
      { surahNumber: 93,  startAyah: 1, endAyah: 11 },
      { surahNumber: 94,  startAyah: 1, endAyah: 8  },
      { surahNumber: 95,  startAyah: 1, endAyah: 8  },
      { surahNumber: 96,  startAyah: 1, endAyah: 19 },
      { surahNumber: 97,  startAyah: 1, endAyah: 5  },
      { surahNumber: 98,  startAyah: 1, endAyah: 8  },
      { surahNumber: 99,  startAyah: 1, endAyah: 8  },
      { surahNumber: 100, startAyah: 1, endAyah: 11 },
      { surahNumber: 101, startAyah: 1, endAyah: 11 },
      { surahNumber: 102, startAyah: 1, endAyah: 8  },
      { surahNumber: 103, startAyah: 1, endAyah: 3  },
      { surahNumber: 104, startAyah: 1, endAyah: 9  },
      { surahNumber: 105, startAyah: 1, endAyah: 5  },
      { surahNumber: 106, startAyah: 1, endAyah: 4  },
      { surahNumber: 107, startAyah: 1, endAyah: 7  },
      { surahNumber: 108, startAyah: 1, endAyah: 3  },
      { surahNumber: 109, startAyah: 1, endAyah: 6  },
      { surahNumber: 110, startAyah: 1, endAyah: 3  },
      { surahNumber: 111, startAyah: 1, endAyah: 5  },
      { surahNumber: 112, startAyah: 1, endAyah: 4  },
      { surahNumber: 113, startAyah: 1, endAyah: 5  },
      { surahNumber: 114, startAyah: 1, endAyah: 6  },
    ],
    ayahCount: 564,
    difficulty: "Advanced",
    estimatedTimeMin: 2400,
    tags: ["juz", "hifz", "amma", "full-juz"],
    ctaLabel: "Begin Journey",
    recommendedFor: ["intermediate", "advanced", "dedicated-learners"],
    sourceType: "builtIn",
    enabled: true,
  },

  {
    id: "juz-1-essentials",
    title: "Juz 1 Essentials",
    localizedTitle: { tr: "1. Cüz Esansiyelleri", ar: "أساسيات الجزء الأول" },
    aliases: ["Juz 1", "First Juz", "Baqarah opening", "Birinci Cüz"],
    section: "hifz-packs",
    group: "juz",
    description:
      "The opening of the Quran and the key ayahs from Juz 1 — Al-Fatiha, the opening of Al-Baqarah, Ayatul Kursi, and Āmanar Rasūlu.",
    ayahRanges: [
      { surahNumber: 1,  startAyah: 1,   endAyah: 7   },
      { surahNumber: 2,  startAyah: 1,   endAyah: 5   },
      { surahNumber: 2,  startAyah: 255, endAyah: 255 },
      { surahNumber: 2,  startAyah: 285, endAyah: 286 },
    ],
    ayahCount: 15,
    difficulty: "Beginner",
    estimatedTimeMin: 30,
    tags: ["juz", "fatiha", "baqarah", "essential"],
    ctaLabel: "Start Memorizing",
    recommendedFor: ["beginners", "reverts"],
    sourceType: "builtIn",
    enabled: true,
  },
];
