/**
 * HuDa Web Quran — Canonical Reciters Data Layer
 * Sourced directly from official SurahQuran: https://surahquran.com/English/mp3.html
 * 
 * Reciter portraits are self-hosted on R2 (`/assets/images/reciters/<id>.jpg`, via mediaUrl),
 * along with verified mp3quran.net streaming audio servers.
 */

import { AUDIO_ONLY_AVAILABLE_SURAHS } from "./reciterAvailability";
import { WORD_SYNC_UNAVAILABLE } from "./wordSyncAvailability";
import { mediaUrl } from "@/lib/media";

export interface QuranReciter {
  id: string;
  name: string;
  displayName: string;
  arabicName: string;
  style: string;
  country: string;
  photoUrl: string;
  audioBaseUrl: string;
  audioUrl?: string;
  localAudioFallback?: string;
  sourceUrl: string;
  isImam: boolean;
  hasAcousticWordTiming: boolean;
  /**
   * Quran.com (QDC) recitation id. Present only for reciters that have
   * word-level acoustic segment data. When set, the app streams the matching
   * quranicaudio.com master (see `qdcAudioTemplate`) and highlights words from
   * the cached `/data/quran-timings/<id>/<surah>.json` dataset.
   */
  qdcId?: number;
  /**
   * quranicaudio.com URL template paired with the QDC segments. `{n}` is the
   * unpadded surah number. Audio + timing MUST come from the same source, so
   * this is only used together with `qdcId`.
   */
  qdcAudioTemplate?: string;
}

export const QURAN_RECITERS: QuranReciter[] = [
  {
    id: "sudais",
    name: "Sheikh Abdul Rahman Al-Sudais",
    displayName: "Abdul Rahman Al-Sudais",
    arabicName: "عبد الرحمن السديس",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/sudais.jpg"),
    audioBaseUrl: "https://server11.mp3quran.net/sds/",
    localAudioFallback: mediaUrl("/assets/audio/surah/001.mp3"),
    sourceUrl: "https://surahquran.com/English/Alsudaes",
    isImam: true,
    hasAcousticWordTiming: true,
  },
  {
    id: "alafasy",
    name: "Sheikh Mishari Al-afasi",
    displayName: "Mishari Al-Afasy",
    arabicName: "مشاري بن راشد العفاسي",
    style: "Hafs A'n Asim · Murattal",
    country: "Kuwait",
    photoUrl: mediaUrl("/assets/images/reciters/alafasy.jpg"),
    audioBaseUrl: "https://server8.mp3quran.net/afs/",
    sourceUrl: "https://surahquran.com/English/Alafasi",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "maher",
    name: "Sheikh Maher Al Muaiqly",
    displayName: "Maher Al-Muaiqly",
    arabicName: "ماهر المعيقلي",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/maher.jpg"),
    audioBaseUrl: "https://server12.mp3quran.net/maher/",
    sourceUrl: "https://surahquran.com/English/maher",
    isImam: true,
    hasAcousticWordTiming: false,
  },
  {
    id: "ghamdi",
    name: "Sheikh Saad Al Ghamdi",
    displayName: "Saad Al-Ghamdi",
    arabicName: "سعد الغامدي",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/ghamdi.jpg"),
    audioBaseUrl: "https://server7.mp3quran.net/s_gmd/",
    sourceUrl: "https://surahquran.com/English/Al-Ghamdi",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "dosari",
    name: "Sheikh Yasser Al Dosari",
    displayName: "Yasser Al-Dosari",
    arabicName: "ياسر الدوسري",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/dosari.jpg"),
    audioBaseUrl: "https://server11.mp3quran.net/yasser/",
    sourceUrl: "https://surahquran.com/English/Al-Dosari",
    isImam: true,
    hasAcousticWordTiming: false,
  },
  {
    id: "abdulbaset",
    name: "Sheikh Abdul Basit Abdul Samad",
    displayName: "Abdul Basit Abdul Samad",
    arabicName: "عبد الباسط عبد الصمد",
    style: "Mujawwad / Tajweed",
    country: "Egypt",
    photoUrl: mediaUrl("/assets/images/reciters/abdulbaset.jpg"),
    audioBaseUrl: "https://server7.mp3quran.net/basit/",
    sourceUrl: "https://surahquran.com/English/Abdulbaset",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "minshawi",
    name: "Muhammad Siddiq Al Minshawi",
    displayName: "Siddiq Al-Minshawi",
    arabicName: "محمد صديق المنشاوي",
    style: "Hafs A'n Asim · Murattal",
    country: "Egypt",
    photoUrl: mediaUrl("/assets/images/reciters/minshawi.jpg"),
    audioBaseUrl: "https://server10.mp3quran.net/minsh/",
    sourceUrl: "https://surahquran.com/English/Al-Minshawi",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "hussary",
    name: "Sheikh Mahmoud Khalil Al Hosary",
    displayName: "Mahmoud Khalil Al-Hosary",
    arabicName: "محمود خليل الحصري",
    style: "Hafs A'n Asim · Murattal",
    country: "Egypt",
    photoUrl: mediaUrl("/assets/images/reciters/hussary.jpg"),
    audioBaseUrl: "https://server13.mp3quran.net/husr/",
    sourceUrl: "https://surahquran.com/English/Al-Hussary",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "hudhaifi",
    name: "Sheikh Ali Al Hudhaifi",
    displayName: "Ali Al-Hudhaifi",
    arabicName: "علي بن عبد الرحمن الحذيفي",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/hudhaifi.jpg"),
    audioBaseUrl: "https://server9.mp3quran.net/hthfi/",
    sourceUrl: "https://surahquran.com/English/Ali-Alhuthaifi",
    isImam: true,
    hasAcousticWordTiming: false,
  },
  {
    id: "ajmi",
    name: "Sheikh Ahmed bin Ali Al Ajmi",
    displayName: "Ahmed Al-Ajmi",
    arabicName: "أحمد بن علي العجمي",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/ajmi.jpg"),
    audioBaseUrl: "https://server10.mp3quran.net/ajm/",
    sourceUrl: "https://surahquran.com/English/Al-Ajmy",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "juhani",
    name: "Sheikh Abdullah Awwad Al Juhani",
    displayName: "Abdullah Al-Juhani",
    arabicName: "عبد الله عواد الجهني",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/juhani.jpg"),
    audioBaseUrl: "https://server13.mp3quran.net/jhn/",
    sourceUrl: "https://surahquran.com/English/Al-Johany",
    isImam: true,
    hasAcousticWordTiming: false,
  },
  {
    id: "shuraim",
    name: "Sheikh Saud Al Shuraim",
    displayName: "Saud Al-Shuraim",
    arabicName: "سعود الشريم",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/shuraim.jpg"),
    audioBaseUrl: "https://server7.mp3quran.net/shur/",
    sourceUrl: "https://surahquran.com/English/Al-Shuraim",
    isImam: true,
    hasAcousticWordTiming: false,
  },
  {
    id: "abbad",
    name: "Sheikh Fares Abbad",
    displayName: "Fares Abbad",
    arabicName: "فارس عباد",
    style: "Hafs A'n Asim · Murattal",
    country: "Yemen",
    photoUrl: mediaUrl("/assets/images/reciters/abbad.jpg"),
    audioBaseUrl: "https://server8.mp3quran.net/frs_a/",
    sourceUrl: "https://surahquran.com/English/Fares",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "shatri",
    name: "Sheikh Abu Bakr Al Shatri",
    displayName: "Abu Bakr Al-Shatri",
    arabicName: "أبو بكر الشاطري",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/shatri.jpg"),
    audioBaseUrl: "https://server11.mp3quran.net/shatri/",
    sourceUrl: "https://surahquran.com/English/Shatri",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "jaber",
    name: "Sheikh Ali Jaber",
    displayName: "Ali Jaber",
    arabicName: "علي جابر",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/jaber.jpg"),
    audioBaseUrl: "https://server11.mp3quran.net/a_jbr/",
    sourceUrl: "https://surahquran.com/English/Jaber",
    isImam: true,
    hasAcousticWordTiming: false,
  },
  {
    id: "tablawi",
    name: "Sheikh Muhammad Mahmoud al Tablawi",
    displayName: "Mohammad Al-Tablawi",
    arabicName: "محمد محمود الطبلاوي",
    style: "Hafs A'n Asim · Murattal",
    country: "Egypt",
    photoUrl: mediaUrl("/assets/images/reciters/tablawi.jpg"),
    audioBaseUrl: "https://server12.mp3quran.net/tblawi/",
    sourceUrl: "https://surahquran.com/English/Tablawi",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "ayyoub",
    name: "Sheikh Mohamed Ayoub",
    displayName: "Mohamed Ayoub",
    arabicName: "محمد أيوب",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/ayyoub.jpg"),
    audioBaseUrl: "https://server8.mp3quran.net/ayyub/",
    sourceUrl: "https://surahquran.com/English/Mohammad_Ayyub",
    isImam: true,
    hasAcousticWordTiming: false,
  },
  {
    id: "balilah",
    name: "Sheikh Bandar Balila",
    displayName: "Bandar Balila",
    arabicName: "بندر بليلة",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/balilah.jpg"),
    audioBaseUrl: "https://server6.mp3quran.net/balilah/",
    sourceUrl: "https://surahquran.com/English/balilah",
    isImam: true,
    hasAcousticWordTiming: false,
  },
  {
    id: "bukhatir",
    name: "Sheikh Salah Bukhatir",
    displayName: "Salah Bukhatir",
    arabicName: "صلاح بو خاطر",
    style: "Hafs A'n Asim · Murattal",
    country: "UAE",
    photoUrl: mediaUrl("/assets/images/reciters/bukhatir.jpg"),
    audioBaseUrl: "https://server8.mp3quran.net/bu_khtr/",
    sourceUrl: "https://surahquran.com/English/Bukhatir",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "basfar",
    name: "Sheikh Abdullah Basfar",
    displayName: "Abdullah Basfar",
    arabicName: "عبد الله بصفر",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/basfar.jpg"),
    audioBaseUrl: "https://server6.mp3quran.net/bsfr/",
    sourceUrl: "https://surahquran.com/English/basfar",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "qatami",
    name: "Sheikh Nasser Al Qatami",
    displayName: "Nasser Al-Qatami",
    arabicName: "ناصر القطامي",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/qatami.jpg"),
    audioBaseUrl: "https://server6.mp3quran.net/qtm/",
    sourceUrl: "https://surahquran.com/English/qattamy",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "banna",
    name: "Sheikh Mahmoud Ali Al Banna",
    displayName: "Mahmoud Ali Al-Banna",
    arabicName: "محمود علي البنا",
    style: "Hafs A'n Asim · Murattal",
    country: "Egypt",
    photoUrl: mediaUrl("/assets/images/reciters/banna.jpg"),
    audioBaseUrl: "https://server8.mp3quran.net/bna/",
    sourceUrl: "https://surahquran.com/English/Mahmoud-El-Banna",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "abkar",
    name: "Reciter Idris Abkar",
    displayName: "Idris Abkar",
    arabicName: "إدريس أبكر",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/abkar.jpg"),
    audioBaseUrl: "https://server6.mp3quran.net/abkr/",
    sourceUrl: "https://surahquran.com/English/Idris-Abkar",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "yamani",
    name: "Reciter Wadih Al Yamani",
    displayName: "Wadih Al-Yamani",
    arabicName: "وديع اليمني",
    style: "Hafs A'n Asim · Murattal",
    country: "Yemen",
    photoUrl: mediaUrl("/assets/images/reciters/yamani.jpg"),
    audioBaseUrl: "https://server6.mp3quran.net/wdee3/",
    sourceUrl: "https://surahquran.com/English/wadie_alyamni",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "refaat",
    name: "Reciter Mohamed Refaat",
    displayName: "Mohamed Refaat",
    arabicName: "محمد رفعت",
    style: "Classic Murattal",
    country: "Egypt",
    photoUrl: mediaUrl("/assets/images/reciters/refaat.jpg"),
    audioBaseUrl: "https://server14.mp3quran.net/refat/",
    sourceUrl: "https://surahquran.com/English/Mohamed-Refaat",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "akhdar",
    name: "Sheikh Ibrahim Al-Akhdar",
    displayName: "Ibrahim Al-Akhdar",
    arabicName: "إبراهيم الأخضر",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/akhdar.jpg"),
    audioBaseUrl: "https://server6.mp3quran.net/akdr/",
    sourceUrl: "https://surahquran.com/English/alakhdar",
    isImam: true,
    hasAcousticWordTiming: false,
  },
  {
    id: "kurdi",
    name: "Sheikh Raad Muhammad Al Kurdi",
    displayName: "Raad Al-Kurdi",
    arabicName: "رعد محمد الكردي",
    style: "Hafs A'n Asim · Murattal",
    country: "Iraq",
    photoUrl: mediaUrl("/assets/images/reciters/kurdi.jpg"),
    audioBaseUrl: "https://server6.mp3quran.net/kurdi/",
    sourceUrl: "https://surahquran.com/English/kordy",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "zahrani",
    name: "Reciter Abdulaziz Az Zahrani",
    displayName: "Abdulaziz Az-Zahrani",
    arabicName: "عبد العزيز الزهراني",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/zahrani.jpg"),
    audioBaseUrl: "https://server9.mp3quran.net/zahrani/",
    sourceUrl: "https://surahquran.com/English/Abdulaziz-Al-Zahrani",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "jalil",
    name: "Reciter Khalid Al Jalil",
    displayName: "Khalid Al-Jalil",
    arabicName: "خالد الجليل",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/jalil.jpg"),
    audioBaseUrl: "https://server10.mp3quran.net/jleel/",
    sourceUrl: "https://surahquran.com/English/aljalil",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "balushi",
    name: "Reciter Hazaa Al Balushi",
    displayName: "Hazaa Al-Balushi",
    arabicName: "هزاع البلوشي",
    style: "Hafs A'n Asim · Murattal",
    country: "Oman",
    photoUrl: mediaUrl("/assets/images/reciters/balushi.jpg"),
    audioBaseUrl: "https://server11.mp3quran.net/hazza/",
    sourceUrl: "https://surahquran.com/English/hazzaa",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "mousa",
    name: "Sheikh Abdullah Al Mousa",
    displayName: "Abdullah Al-Mousa",
    arabicName: "عبد الله الموسى",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/mousa.jpg"),
    audioBaseUrl: "https://server14.mp3quran.net/mousa/Rewayat-Hafs-A-n-Assem/",
    sourceUrl: "https://surahquran.com/English/mosa",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "oosi",
    name: "Sheikh Abdulrahman Al Ossi",
    displayName: "Abdulrahman Al-Ossi",
    arabicName: "عبد الرحمن العوسي",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/oosi.jpg"),
    audioBaseUrl: "https://server6.mp3quran.net/aloosi/",
    sourceUrl: "https://surahquran.com/English/AbdAlrahman-Al3osy",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "jibril",
    name: "Sheikh Muhammad Jibril",
    displayName: "Muhammad Jibril",
    arabicName: "محمد جبريل",
    style: "Hafs A'n Asim · Murattal",
    country: "Egypt",
    photoUrl: mediaUrl("/assets/images/reciters/jibril.jpg"),
    audioBaseUrl: "https://server8.mp3quran.net/jbrl/",
    sourceUrl: "https://surahquran.com/English/Jibrel",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "saleh",
    name: "Sheikh Hassan Mohamed Saleh",
    displayName: "Hassan Mohamed Saleh",
    arabicName: "حسن محمد صالح",
    style: "Hafs A'n Asim · Murattal",
    country: "Egypt",
    photoUrl: mediaUrl("/assets/images/reciters/saleh.jpg"),
    audioBaseUrl: "https://server16.mp3quran.net/h_saleh/Rewayat-Hafs-A-n-Assem/",
    sourceUrl: "https://surahquran.com/English/Hassan-Saleh",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "barrak",
    name: "Reciter Mohammed Al Barrak",
    displayName: "Mohammed Al-Barrak",
    arabicName: "محمد البراك",
    style: "Hafs A'n Asim · Murattal",
    country: "Kuwait",
    photoUrl: mediaUrl("/assets/images/reciters/barrak.jpg"),
    audioBaseUrl: "https://server13.mp3quran.net/braak/",
    sourceUrl: "https://surahquran.com/English/barrak",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "toure",
    name: "Mohamed Hadi Toure",
    displayName: "Mohamed Hadi Toure",
    arabicName: "محمد هادي توري",
    style: "Hafs A'n Asim · Murattal",
    country: "Senegal",
    photoUrl: mediaUrl("/assets/images/reciters/toure.jpg"),
    audioBaseUrl: "https://server10.mp3quran.net/toure/",
    sourceUrl: "https://surahquran.com/English/Hadi-Toure",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "tunaiji",
    name: "Reciter Khalifa Al Tunaiji",
    displayName: "Khalifa Al-Tunaiji",
    arabicName: "خليفة الطنيجي",
    style: "Hafs A'n Asim · Murattal",
    country: "UAE",
    photoUrl: mediaUrl("/assets/images/reciters/tunaiji.jpg"),
    audioBaseUrl: "https://server12.mp3quran.net/tnjy/",
    sourceUrl: "https://surahquran.com/English/khalifa",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "jazairi",
    name: "Sheikh Yasin Al Jazairi",
    displayName: "Yasin Al-Jazairi",
    arabicName: "ياسين الجزائري",
    style: "Warsh A'n Nafi'",
    country: "Algeria",
    photoUrl: mediaUrl("/assets/images/reciters/jazairi.jpg"),
    audioBaseUrl: "https://server11.mp3quran.net/jaza/",
    sourceUrl: "https://surahquran.com/English/yaseen",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "alzain",
    name: "Reciter Al-Zain Mohamed Ahmed",
    displayName: "Al-Zain Mohamed Ahmed",
    arabicName: "الزين محمد أحمد",
    style: "Al-Duri A'n Abi Amr",
    country: "Sudan",
    photoUrl: mediaUrl("/assets/images/reciters/alzain.jpg"),
    audioBaseUrl: "https://server9.mp3quran.net/alzain/",
    sourceUrl: "https://surahquran.com/English/zain",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "alarabi",
    name: "Reciter Omar Hisham Al Arabi",
    displayName: "Omar Hisham Al-Arabi",
    arabicName: "عمر هشام العربي",
    style: "Hafs A'n Asim · Murattal",
    country: "Egypt",
    photoUrl: mediaUrl("/assets/images/reciters/alarabi.jpg"),
    audioBaseUrl: "https://server16.mp3quran.net/o_alarabi/Rewayat-Hafs-A-n-Assem/",
    sourceUrl: "https://surahquran.com/English/Omar-Hisham",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "muhaisni",
    name: "Reciter Muhammad Al Muhaisni",
    displayName: "Muhammad Al-Muhaisni",
    arabicName: "محمد المحيسني",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/muhaisni.jpg"),
    audioBaseUrl: "https://server11.mp3quran.net/mhsny/",
    sourceUrl: "https://surahquran.com/English/Almohisni",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "lhdan",
    name: "Sheikh Mohamed Ellhidan",
    displayName: "Mohamed Al-Luhaydan",
    arabicName: "محمد اللحيدان",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/lhdan.jpg"),
    audioBaseUrl: "https://server8.mp3quran.net/lhdan/",
    sourceUrl: "https://surahquran.com/English/allheadan",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "peshawa",
    name: "Reciter Peshawa Qader Al Kurdi",
    displayName: "Peshawa Al-Kurdi",
    arabicName: "بيشوا قادر الكردي",
    style: "Hafs A'n Asim · Murattal",
    country: "Iraq",
    photoUrl: mediaUrl("/assets/images/reciters/peshawa.jpg"),
    audioBaseUrl: "https://server16.mp3quran.net/peshawa/Rewayat-Hafs-A-n-Assem/",
    sourceUrl: "https://surahquran.com/English/peshawa",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "khalaf",
    name: "Reciter Abdullah Al Khalaf",
    displayName: "Abdullah Al-Khalaf",
    arabicName: "عبد الله الخلف",
    style: "Hafs A'n Asim · Murattal",
    country: "Kuwait",
    photoUrl: mediaUrl("/assets/images/reciters/khalaf.jpg"),
    audioBaseUrl: "https://server14.mp3quran.net/khalf/",
    sourceUrl: "https://surahquran.com/English/Abdullah-Al-Khalaf",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "noreen",
    name: "Sheikh Noreen Mohamed Siddiq",
    displayName: "Noreen Mohamed Siddiq",
    arabicName: "نورين محمد صديق",
    style: "Al-Duri A'n Abi Amr",
    country: "Sudan",
    photoUrl: mediaUrl("/assets/images/reciters/noreen.jpg"),
    audioBaseUrl: "https://server16.mp3quran.net/nourin_siddig/Rewayat-Aldori-A-n-Abi-Amr/",
    sourceUrl: "https://surahquran.com/English/Noreen-Siddiq",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "soufi",
    name: "Reciter Abdul Rashid Sufi",
    displayName: "Abdul Rashid Sufi",
    arabicName: "عبد الرشيد صوفي",
    style: "Hafs A'n Asim · Murattal",
    country: "Somalia",
    photoUrl: mediaUrl("/assets/images/reciters/soufi.jpg"),
    audioBaseUrl: "https://server16.mp3quran.net/soufi/Rewayat-Hafs-A-n-Assem/",
    sourceUrl: "https://surahquran.com/English/soufi",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "salmi",
    name: "Reciter Mansour Al Salmi",
    displayName: "Mansour Al-Salmi",
    arabicName: "منصور السالمي",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/salmi.jpg"),
    audioBaseUrl: "https://server14.mp3quran.net/mansor/",
    sourceUrl: "https://surahquran.com/English/Mansour",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "rayan",
    name: "Sheikh Adel Rayan",
    displayName: "Adel Rayan",
    arabicName: "عادل ريان",
    style: "Hafs A'n Asim · Murattal",
    country: "Saudi Arabia",
    photoUrl: mediaUrl("/assets/images/reciters/rayan.jpg"),
    audioBaseUrl: "https://server8.mp3quran.net/ryan/",
    sourceUrl: "https://surahquran.com/English/Adel-Ryan",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "nufais",
    name: "Reciter Ahmad Alnufais",
    displayName: "Ahmad Al-Nufais",
    arabicName: "أحمد النفيس",
    style: "Hafs A'n Asim · Murattal",
    country: "Kuwait",
    photoUrl: mediaUrl("/assets/images/reciters/nufais.jpg"),
    audioBaseUrl: "https://server16.mp3quran.net/nufais/Rewayat-Hafs-A-n-Assem/",
    sourceUrl: "https://surahquran.com/English/Ahmad-Alnufais",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "waer",
    name: "Reciter Hatem Fareed Al Waer",
    displayName: "Hatem Fareed",
    arabicName: "حاتم فريد الواعر",
    style: "Hafs A'n Asim · Murattal",
    country: "Egypt",
    photoUrl: mediaUrl("/assets/images/reciters/waer.jpg"),
    audioBaseUrl: "https://server11.mp3quran.net/hatem/",
    sourceUrl: "https://surahquran.com/English/hatem",
    isImam: false,
    hasAcousticWordTiming: false,
  },
  {
    id: "shorbaji",
    name: "Reciter Ghassan Al Shorbaji",
    displayName: "Ghassan Al-Shorbaji",
    arabicName: "غسان الشوربجي",
    style: "Hafs A'n Asim · Murattal",
    country: "Syria",
    photoUrl: mediaUrl("/assets/images/reciters/shorbaji.jpg"),
    audioBaseUrl: "https://server8.mp3quran.net/shor/",
    sourceUrl: "https://surahquran.com/English/ghassan",
    isImam: false,
    hasAcousticWordTiming: false,
  },
];

/**
 * Reciters with Quran.com (QDC) word-level acoustic segment data.
 * Audio streams from the matching quranicaudio.com master so that the cached
 * word timings in `/data/quran-timings/<id>/<surah>.json` stay perfectly in
 * sync with the voice — at whatever pace each reciter recites.
 *
 * `{n}`   -> unpadded surah number (e.g. 1, 114)
 * `{nnn}` -> zero-padded to 3 digits (e.g. 001, 114)
 *
 * All templates are HEAD-verified (surahs 1, 36, 114) by
 * scripts/generation/fetch-reciter-timings.mjs.
 */
const QDC_TIMING_RECITERS: Record<string, { qdcId: number; template: string }> = {
  sudais: { qdcId: 3, template: "https://download.quranicaudio.com/qdc/abdurrahmaan_as_sudais/murattal/{n}.mp3" },
  alafasy: { qdcId: 7, template: "https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/{n}.mp3" },
  dosari: { qdcId: 97, template: "https://download.quranicaudio.com/quran/yasser_ad-dussary/{nnn}.mp3" },
  abdulbaset: { qdcId: 2, template: "https://download.quranicaudio.com/qdc/abdul_baset/murattal/{n}.mp3" },
  minshawi: { qdcId: 9, template: "https://download.quranicaudio.com/qdc/siddiq_minshawi/murattal/{n}.mp3" },
  hussary: { qdcId: 6, template: "https://download.quranicaudio.com/qdc/khalil_al_husary/murattal/{n}.mp3" },
  shuraim: { qdcId: 10, template: "https://download.quranicaudio.com/qdc/saud_ash-shuraym/murattal/{nnn}.mp3" },
  shatri: { qdcId: 4, template: "https://download.quranicaudio.com/qdc/abu_bakr_shatri/murattal/{n}.mp3" },
  tunaiji: { qdcId: 161, template: "https://download.quranicaudio.com/qdc/khalifah_taniji/murattal/{n}.mp3" },
};

// Attach QDC word-timing capability to the matching reciters.
for (const reciter of QURAN_RECITERS) {
  const qdc = QDC_TIMING_RECITERS[reciter.id];
  if (qdc) {
    reciter.qdcId = qdc.qdcId;
    reciter.qdcAudioTemplate = qdc.template;
    reciter.hasAcousticWordTiming = true;
  } else {
    reciter.hasAcousticWordTiming = false;
  }
}

/** True when the reciter has word-level acoustic timing paired with QDC audio. */
export function reciterHasWordTiming(reciter?: QuranReciter | null): boolean {
  return !!reciter?.qdcId && !!reciter?.qdcAudioTemplate;
}

/**
 * Why a Word Sync reciter's timing can't be used for one Surah (null = usable).
 * The audio at that Surah's URL is a different recording than the one its QDC
 * timings were measured on (verified acoustically by scripts/qa), so the
 * Surah plays audio-only instead of highlighting the wrong words.
 */
export function wordSyncUnavailableReason(
  reciter: QuranReciter | null | undefined,
  surahNumber: number | null | undefined
): string | null {
  if (!reciter || !surahNumber) return null;
  return WORD_SYNC_UNAVAILABLE[reciter.id]?.[surahNumber] ?? null;
}

/**
 * Word Sync for this reciter AND this Surah: the reciter has word timings and
 * they match the recording streamed for the Surah. Without a Surah (Juz, or
 * nothing playing) it is the reciter-level capability.
 */
export function reciterHasWordTimingFor(
  reciter: QuranReciter | null | undefined,
  surahNumber: number | null | undefined
): boolean {
  return reciterHasWordTiming(reciter) && !wordSyncUnavailableReason(reciter, surahNumber);
}

/**
 * Whether the reciter's server really has this Surah. Audio Only reciters list
 * their gaps in reciterAvailability.ts (checked by scripts/qa/audio-sources.cjs);
 * Word Sync reciters stream a complete QDC master set.
 */
export function reciterHasSurah(reciter: QuranReciter | null | undefined, surahNumber: number): boolean {
  if (!reciter) return false;
  const only = AUDIO_ONLY_AVAILABLE_SURAHS[reciter.id];
  return !only || only.includes(surahNumber);
}

/** A reciter whose server has none of the Surahs (shown as unavailable). */
export function reciterIsUnavailable(reciter: QuranReciter | null | undefined): boolean {
  return Boolean(reciter && AUDIO_ONLY_AVAILABLE_SURAHS[reciter.id]?.length === 0);
}

/**
 * True when the reciter's paired audio master already recites its OWN Bismillah
 * before ayah 1 of the given surah (surahs 2-114; surah 9 has no Bismillah).
 *
 * Only Yasser Al-Dosari streams a quranicaudio.com full-surah master
 * (…/quran/yasser_ad-dussary/NNN.mp3) that includes the Bismillah, and only for
 * surahs 2-78 — his juz-30 files (79-114) begin directly at ayah 1. Every other
 * word-timing reciter streams a QDC murattal master (…/qdc/…/murattal/N.mp3)
 * that always begins at ayah 1 with no Bismillah.
 *
 * Verified from the cached /data/quran-timings datasets (ayah-1 onset ≥ 1.5s for
 * Dosari 2-78, ≈0s everywhere else). When this returns false the app plays its
 * own dedicated Bismillah prelude clip, so word-sync surahs 2-114 always open
 * with the Bismillah while never doubling it.
 */
export function reciterEmbedsOwnBismillah(
  reciter: QuranReciter | null | undefined,
  surahNumber: number
): boolean {
  if (!reciterHasWordTiming(reciter)) return false;
  if (surahNumber < 2 || surahNumber === 9) return false;
  return reciter!.id === "dosari" && surahNumber <= 78;
}

export const RECITER_STORAGE_KEY = "huda-selected-reciter";

export function getDefaultReciter(): QuranReciter {
  // Landing reciter on every page load: Sheikh Mishari Al-afasi (Word Sync).
  return QURAN_RECITERS.find((r) => r.id === "alafasy") ?? QURAN_RECITERS[0];
}

const RECITER_ALIASES: Record<string, string> = {
  "maher-al-muaiqly": "maher",
  "abdul-rahman-al-sudais": "sudais",
  "mishari-al-afasy": "alafasy",
};

export function getReciterById(id?: string | null): QuranReciter {
  if (!id) return getDefaultReciter();
  const resolvedId = RECITER_ALIASES[id] || id;
  return QURAN_RECITERS.find((r) => r.id === resolvedId) || getDefaultReciter();
}

export function resolveActiveReciter(
  trackOrSpeakerOrId?:
    | {
        speaker?: { id?: string | null; slug?: string | null } | null;
        speakerId?: string | null;
        audioUrl?: string | null;
      }
    | string
    | null
): QuranReciter {
  if (typeof trackOrSpeakerOrId === "string") {
    return getReciterById(trackOrSpeakerOrId);
  }

  // 0. From Maher's full-Juz audio URL (MAHER_JUZ_AUDIO_DIR in quran.ts)
  if (trackOrSpeakerOrId?.audioUrl && trackOrSpeakerOrId.audioUrl.includes("/audio/juz/maher/")) {
    return getReciterById("maher");
  }

  // 1. From speaker object slug or id
  if (trackOrSpeakerOrId?.speaker?.slug) {
    const r = getReciterById(trackOrSpeakerOrId.speaker.slug);
    if (r && r.id === trackOrSpeakerOrId.speaker.slug) return r;
  }
  if (trackOrSpeakerOrId?.speaker?.id?.startsWith("reciter-")) {
    const reciterId = trackOrSpeakerOrId.speaker.id.replace("reciter-", "");
    const r = getReciterById(reciterId);
    if (r && r.id === reciterId) return r;
  }

  // 2. From speakerId
  if (trackOrSpeakerOrId?.speakerId?.startsWith("reciter-")) {
    const reciterId = trackOrSpeakerOrId.speakerId.replace("reciter-", "");
    const r = getReciterById(reciterId);
    if (r && r.id === reciterId) return r;
  }

  // 3. From audioUrl pattern matching
  if (trackOrSpeakerOrId?.audioUrl && typeof trackOrSpeakerOrId.audioUrl === "string") {
    const url = trackOrSpeakerOrId.audioUrl;
    const byAudio = QURAN_RECITERS.find((r) => r.audioBaseUrl && url.includes(r.audioBaseUrl));
    if (byAudio) return byAudio;
  }

  // 4. From localStorage (persisted user selection)
  if (typeof window !== "undefined") {
    try {
      const savedId = localStorage.getItem(RECITER_STORAGE_KEY);
      if (savedId) {
        const r = getReciterById(savedId);
        if (r && r.id === savedId) return r;
      }
    } catch {
      /* ignore */
    }
  }

  // 5. Default fallback
  return getDefaultReciter();
}

export function buildReciterSurahUrl(reciter: QuranReciter, surahNumber: number): string {
  // Reciters with QDC word-timing stream the paired quranicaudio.com master so
  // that voice and word highlights stay in exact sync.
  if (reciter.qdcAudioTemplate) {
    return reciter.qdcAudioTemplate
      .replace("{nnn}", String(surahNumber).padStart(3, "0"))
      .replace("{n}", String(surahNumber));
  }
  // Fallback: mp3quran.net full-surah audio (ayah-level glow, no word timing).
  const pad = String(surahNumber).padStart(3, "0");
  const base = reciter.audioBaseUrl.endsWith("/") ? reciter.audioBaseUrl : `${reciter.audioBaseUrl}/`;
  return `${base}${pad}.mp3`;
}

export type ReciterTimingMode = "EXACT_WORD_TIMING" | "AYAH_LEVEL_FALLBACK";

export interface ReciterTimingCapability {
  mode: ReciterTimingMode;
  hasWordTiming: boolean;
  sourceDescription: string;
}

export function getReciterTimingCapability(
  reciter?: QuranReciter | null,
  surahNumber?: number | null
): ReciterTimingCapability {
  // Word-level acoustic timing: any reciter with QDC segment data paired with
  // its quranicaudio.com master — except the Surahs whose streamed recording
  // doesn't match those timings (see wordSyncUnavailableReason).
  if (reciterHasWordTimingFor(reciter, surahNumber)) {
    return {
      mode: "EXACT_WORD_TIMING",
      hasWordTiming: true,
      sourceDescription: `Quran.com Word Segment Alignment (${reciter?.displayName || reciter?.name})`,
    };
  }
  const name = reciter?.displayName || reciter?.name || "Selected Reciter";
  const why = wordSyncUnavailableReason(reciter, surahNumber);
  if (why) {
    return {
      mode: "AYAH_LEVEL_FALLBACK",
      hasWordTiming: false,
      sourceDescription: `Word Sync unavailable for this Surah (${name}): ${why}`,
    };
  }
  return {
    mode: "AYAH_LEVEL_FALLBACK",
    hasWordTiming: false,
    sourceDescription: `Ayah Boundary Sync (Fallback — Word Timing Unverified for ${name})`,
  };
}

/**
 * everyayah.com folder names for reciters that publish per-ayah recitations.
 * Used to assemble a Juz's exact ayahs in a chosen reciter's voice (see
 * buildJuzAyahUrls in quran.ts). Verified reachable (HTTP 200). Reciters absent
 * from this map fall back to whole-surah playback.
 */
export const EVERYAYAH_FOLDERS: Record<string, string> = {
  sudais: "Abdurrahmaan_As-Sudais_192kbps",
  alafasy: "Alafasy_128kbps",
  maher: "Maher_AlMuaiqly_64kbps",
  ghamdi: "Ghamadi_40kbps",
  dosari: "Yasser_Ad-Dussary_128kbps",
  abdulbaset: "Abdul_Basit_Murattal_192kbps",
  minshawi: "Minshawy_Murattal_128kbps",
  hussary: "Husary_128kbps",
  hudhaifi: "Hudhaify_128kbps",
  ajmi: "ahmed_ibn_ali_al_ajamy_128kbps",
  juhani: "Abdullaah_3awwaad_Al-Juhaynee_128kbps",
  shuraim: "Saood_ash-Shuraym_128kbps",
  shatri: "Abu_Bakr_Ash-Shaatree_128kbps",
  basfar: "Abdullah_Basfar_192kbps",
  qatami: "Nasser_Alqatami_128kbps",
  banna: "mahmoud_ali_al_banna_32kbps",
  akhdar: "Ibrahim_Akhdar_32kbps",
  abbad: "Fares_Abbad_64kbps",
  jaber: "Ali_Jaber_64kbps",
  ayyoub: "Muhammad_Ayyoub_128kbps",
  tablawi: "Mohammad_al_Tablaway_128kbps",
};

/** everyayah folder for a reciter id, or null if it has no per-ayah recitation. */
export function getEveryAyahFolder(reciterId: string): string | null {
  return EVERYAYAH_FOLDERS[reciterId] ?? null;
}
