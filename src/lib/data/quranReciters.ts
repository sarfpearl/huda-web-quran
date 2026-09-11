/**
 * HuDa Web Quran — Canonical Reciters Data Layer
 * Sourced directly from official SurahQuran: https://surahquran.com/English/mp3.html
 * 
 * Every reciter uses the authentic portrait hosted on the official Pinterest CDN
 * as referenced on surahquran.com, along with verified mp3quran.net streaming audio servers.
 */

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
    photoUrl: "https://i.pinimg.com/564x/32/2c/17/322c1736a5bab17ef54e14717ac90e8a.jpg",
    audioBaseUrl: "https://server11.mp3quran.net/sds/",
    localAudioFallback: "/assets/audio/surah/001.mp3",
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
    photoUrl: "https://i.pinimg.com/564x/d3/1c/c0/d31cc05ca4198ee3dcd3558a2254b979.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/3a/56/a0/3a56a0428ad0faca14b51ba27d74fc9b.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/0d/c9/07/0dc907282821cf2fd3022c5711f1ab7a.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/ce/16/20/ce162057a1ade9c255b35c87fc7edd93.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/52/95/ae/5295ae7c08e4ebdc7eda3ddb5c6c0a19.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/88/e0/44/88e0449e73816003c09354e85def9465.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/3f/da/7e/3fda7ed5056347e700cac64d07e164c3.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/c3/c6/13/c3c613152ca1452e0c3c314e35c93724.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/b1/9f/03/b19f03a9f2f09c46afbfd4f03727aee7.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/aa/4d/0b/aa4d0b16c5fbc41efcd692947a4d75ad.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/ad/79/67/ad79679d76062df7166c6e2f52d397d6.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/fd/f5/aa/fdf5aa6d140c8264d6041179a003b5b0.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/d6/c6/33/d6c633aadb82ce2d974d1147ed071090.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/61/a3/15/61a31568e91191aaff40e0a24492850c.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/82/ba/15/82ba15a4a28efd39d0a7aa0f840753af.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/ec/f7/aa/ecf7aa757a458dd7762e6d8c94d5c6e3.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/0a/d1/da/0ad1da42ff74913a543126bde4b4fee5.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/98/48/78/98487861e70e245857103a779f1539ae.jpg",
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
    photoUrl: "https://i.pinimg.com/236x/f5/7b/a1/f57ba14ba4844cee88cdf7cfb2b06510.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/52/de/a5/52dea5b5ce9ea312315229b0bde677cd.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/28/8a/2a/288a2a1237b195e44c24a0c4451e089a.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/0b/11/f0/0b11f0c2cc89342283e947f349a3f803.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/e9/9e/90/e99e9020d1d7cd27beaaed7010086d4a.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/da/9a/a2/da9aa2a43adf1b16b5239e601ee85113.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/95/e4/90/95e490b6c075566f62197da844dae903.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/15/8c/a2/158ca275b0f1d579e9d13b33193b12a8.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/9d/c5/05/9dc505f34c6e9de25e3ee21895712283.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/9b/26/36/9b2636f5bbf7ef72abdb817018e96a4d.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/74/7c/9a/747c9a404c24c4e604cf51f197d8b3b5.jpg",
    audioBaseUrl: "https://server11.mp3quran.net/bals/Rewayat-Hafs-A-n-Assem/",
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
    photoUrl: "https://i.pinimg.com/564x/97/3a/24/973a243e5c4c9bbca49c2c172d065cd9.jpg",
    audioBaseUrl: "https://server16.mp3quran.net/A_mosa/Rewayat-Hafs-A-n-Assem/",
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
    photoUrl: "https://i.pinimg.com/564x/8f/95/8e/8f958ed8cbafc0c0dcf5c58e3c001221.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/fe/69/9e/fe699e3970550240fb078ee720773db4.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/24/34/cb/2434cb5ec027fb938e4fd8312a245b96.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/df/1b/46/df1b46241d232a57c8a9c88b29b71f00.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/27/34/e2/2734e25e357c68fa15ba6e8b70226334.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/56/1b/17/561b17211f66cfb725f12b5fca5312d3.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/47/26/1a/47261a9e304a8aa18e94d7bb67baa6db.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/8e/31/20/8e3120dcfef2a6e64fece818f7788b27.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/87/09/f5/8709f5bbfcbf7efbba3d5efa8f0254c8.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/27/45/cc/2745ccba8fd20ccc545fda3618986a0c.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/a4/cd/74/a4cd749ed1726e63e8a62e279e5ea564.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/6d/9f/57/6d9f57d7f94ca3357a02c98c6fa28f5f.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/66/d7/d0/66d7d05f68c6046033ab462027d695b4.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/45/8f/cc/458fccfd5286a51ee1d41e5967f57446.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/80/56/ee/8056ee030160e5c7216811b7b209343c.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/52/7a/4a/527a4a187bb99966683ef3e041bc6644.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/a8/fa/a3/a8faa3ebb7423426a82dc617f9e985d9.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/16/c2/d1/16c2d12311ff7132b8e4f48565d50e4d.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/e8/0d/93/e80d935205b540f3f16518f6bfd35033.jpg",
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
    photoUrl: "https://i.pinimg.com/564x/9a/1b/28/9a1b283753fb8d9da9e7bf5b5b415770.jpg",
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

export const RECITER_STORAGE_KEY = "huda-selected-reciter";

export function getDefaultReciter(): QuranReciter {
  return QURAN_RECITERS[0]; // Sheikh Abdul Rahman Al-Sudais
}

export function getReciterById(id?: string | null): QuranReciter {
  if (!id) return getDefaultReciter();
  return QURAN_RECITERS.find((r) => r.id === id) || getDefaultReciter();
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
  // Word-level acoustic timing is available for every surah of any reciter that
  // has QDC segment data paired with its quranicaudio.com master.
  if (reciterHasWordTiming(reciter)) {
    return {
      mode: "EXACT_WORD_TIMING",
      hasWordTiming: true,
      sourceDescription: `Quran.com Word Segment Alignment (${reciter?.displayName || reciter?.name})`,
    };
  }
  const name = reciter?.displayName || reciter?.name || "Selected Reciter";
  return {
    mode: "AYAH_LEVEL_FALLBACK",
    hasWordTiming: false,
    sourceDescription: `Ayah Boundary Sync (Fallback — Word Timing Unverified for ${name})`,
  };
}
