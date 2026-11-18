/*
 * The reminder notification's own text, in each app language. Plain data (no
 * React), used by the sender route (/api/reminders/send).
 */

export type ReminderLang = "en" | "ta" | "ur" | "ml" | "hi" | "id" | "bn" | "tr" | "fr" | "ms";

export const REMINDER_MESSAGES: Record<ReminderLang, { title: string; body: string }> = {
  en: { title: "Time to read the Quran", body: "Your reading reminder from HuDa. Tap to open and continue." },
  ta: { title: "குர்ஆன் ஓதும் நேரம்", body: "HuDa-வின் வாசிப்பு நினைவூட்டல். தொட்டுத் திறந்து தொடருங்கள்." },
  ur: { title: "قرآن پڑھنے کا وقت", body: "HuDa کی جانب سے تلاوت کی یاد دہانی۔ کھولنے کے لیے دبائیں۔" },
  ml: { title: "ഖുർആൻ ഓതാനുള്ള സമയം", body: "HuDa-യിൽ നിന്നുള്ള വായനാ ഓർമ്മപ്പെടുത്തൽ. തുറന്ന് തുടരാൻ തൊടുക." },
  hi: { title: "क़ुरआन पढ़ने का समय", body: "HuDa की ओर से पढ़ने की याद। खोलकर जारी रखने के लिए छुएँ।" },
  id: { title: "Waktunya membaca Al-Qur'an", body: "Pengingat membaca dari HuDa. Ketuk untuk membuka dan melanjutkan." },
  bn: { title: "কুরআন পড়ার সময়", body: "HuDa থেকে পড়ার রিমাইন্ডার। খুলে চালিয়ে যেতে ট্যাপ করুন।" },
  tr: { title: "Kur'an okuma vakti", body: "HuDa'dan okuma hatırlatıcınız. Açıp devam etmek için dokunun." },
  fr: { title: "C'est l'heure de lire le Coran", body: "Votre rappel de lecture HuDa. Touchez pour ouvrir et continuer." },
  ms: { title: "Masa untuk membaca al-Quran", body: "Peringatan bacaan daripada HuDa. Ketik untuk buka dan teruskan." },
};

/** The push payload the service worker shows (public/sw.js, "push"). */
export function reminderPayload(lang: string): { title: string; body: string; url: string; tag: string; lang: string } {
  const l = (lang in REMINDER_MESSAGES ? lang : "en") as ReminderLang;
  return { ...REMINDER_MESSAGES[l], url: "/", tag: "huda-reading-reminder", lang: l };
}
