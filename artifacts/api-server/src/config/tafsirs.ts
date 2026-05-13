export const tafsirs = {
  jalalayn: {
    key: "jalalayn",
    name: "Tafsir al-Jalalayn",
    author: "Jalal al-Din al-Mahalli and Jalal al-Din al-Suyuti",
    language: "en",
    slug: "en-tafsir-jalalayn",
  },
  maarif: {
    key: "maarif",
    name: "Ma'arif al-Qur'an",
    author: "Mufti Muhammad Shafi",
    language: "en",
    resourceId: 168,
    slug: "en-tafsir-maarif-ul-quran",
  },
  ibn_kathir: {
    key: "ibn_kathir",
    name: "Tafsir Ibn Kathir",
    author: "Hafiz Ibn Kathir",
    language: "en",
    resourceId: 169,
    slug: "en-tafisr-ibn-kathir",
  },
  as_sadi: {
    key: "as_sadi",
    name: "Tafsir as-Sa'di",
    author: "Abd al-Rahman al-Sa'di",
    language: "en",
    slug: "en-tafsir-as-sadi",
  },
} as const;

export type TafsirKey = keyof typeof tafsirs;
