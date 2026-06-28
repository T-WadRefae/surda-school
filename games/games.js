/* ===========================================================
   أقسام وألعاب مخيم سردا الصيفي
   -----------------------------------------------------------
   SECTIONS: الأقسام التي يختار منها الطالب (مادة/مجال).
   الألعاب الدائمة محفوظة في games-data.json (يديره المساعد للجميع).
   FALLBACK_GAMES: قائمة احتياطية تظهر فقط إذا تعذّر تحميل الملف.
   =========================================================== */

/* الأقسام المتاحة */
window.SECTIONS = [
  { id: "english", title: "اللغة الإنجليزية",   icon: "🔤", color: "green"  },
  { id: "arabic",  title: "اللغة العربية",      icon: "📖", color: "teal"   },
  { id: "math",    title: "الرياضيات",          icon: "🧮", color: "blue"   },
  { id: "science", title: "العلوم",             icon: "🔬", color: "purple" },
  { id: "social", title: "الدراسات الاجتماعية",  icon: "🧭", color: "gold"   }
];

/* مسار ملف البيانات الدائم (المصدر الحقيقي للألعاب) */
window.GAMES_DATA_URL = "games-data.json";

/* قائمة احتياطية تظهر فقط إذا تعذّر تحميل games-data.json */
window.FALLBACK_GAMES = [
  {
    id: "english-1",
    title: "تعلّم الإنجليزية",
    desc: "العب وتعلّم الحروف والكلمات",
    icon: "🔤",
    color: "green",
    section: "english",
    link: "#"
  }
];
