VYBE — Color Wheel & Harmony Feature Pack
==========================================

هذا الملف يحتوي على 12 ملف فقط (مو الموقع كامل!).
انسخي كل ملف فوق النسخة الموجودة عندك بنفس المسار — ما في أي خطوة setup.

كيفية التركيب (Windows cmd):
---------------------------
1. فكي ضغط الملف — بيطلع مجلد اسمه vybe
2. انسخي مجلد src كامل فوق مجلد src الموجود في vybe-source عندك
   (وقتي ديز: حدد مجلد src الجديد، كوبي، روحي على فولدر مشروعك، paste،
   واختاري "Replace the files in the destination")
3. انسخي README.md فوق الموجود (اختياري — بس يحدث جدول موديلات Groq)

خلاص! ما في npm install، ما في prisma، ما في .env جديد.
4. أوقفي السيرفر (Ctrl+C) وشغليه من جديد:
   npx next dev -p 3000

شو الجديد؟
----------
1. حلقة الألوان (Color Wheel) — بصفحة Outfit Studio:
   - حلقة ألوان تفاعلية مرسومة بألوان خزانتك
   - اضغطي على أي لون — بتشوفي خط التكميلي (المضاد على الحلقة)
     وأي قطع عندك بتنسق معه
   - النيوترلز (أسود، كريمي، نيفي...) ظاهرين تحت الحلقة

2. تناسق الألوان بالـ stylist:
   - الـ AI صار يستلم موقع كل قطعة على حلقة الألوان، وموجّه يبني
     إطلالات Complementary / Analogous / Neutral + Accent
   - حتى الـ rule-based stylist (وقت ما الـ AI يوقف) صار يختار
     الألوان المنسقة ويشرح المنطق: "a complementary pairing of wine and emerald"

3. تحليل الصور (بجواب سؤالك — سه مش صعب!):
   - لما ترفعي صورة قطعة، الموقع بيقرا الألوان الغالبة من الصورة
     نفسها (canvas محلي — بدون AI وبدون انترنت) وبيعبي خانة
     Colorway تلقائياً، وفيه chips تقدري تختاري منها

4. على كروت الإطلالات:
   - شريط Palette (دوائر ألوان الإطلالة) + اسم علاقة الألوان
     (Complementary / Analogous / Quiet neutrals / ...)

5. إصلاحين صغيرين للـ TypeScript كانوا ممكن يوقفوا npm run build

ملاحظة مهمة — Groq موديل:
------------------------
إذا لسا موقفة على llama-3.3-70b-versatile وهيك بيدي 404:
غيّري سطر OPENAI_MODEL بملف .env إلى:
   OPENAI_MODEL="llama-3.1-8b-instant"
أو
   OPENAI_MODEL="openai/gpt-oss-120b"

وللتحقق من الموديلات المتاحة لمفتاحك (انسخي المفتاح كامل مكان gsk_YOUR_KEY):
   curl.exe https://api.groq.com/openai/v1/models -H "Authorization: Bearer gsk_YOUR_KEY"

و بعد تعديل .env لازم إعادة تشغيل كاملة للسيرفر.
و تذكري: الإطلالات القديمة بتفضل عليها شارة "Rule-based stylist" للأبد —
اعملي توليد جديد لكي تشوفي القوة الحقيقية.

الملفات (12):
-------------
src/lib/colors.ts                                  (جديد — محرك الألوان)
src/lib/color-extract.ts                           (جديد — قراءة الألوان من الصور)
src/components/color-wheel.tsx                     (جديد — الحلقة التفاعلية)
src/components/item-form.tsx                       (محدث — اكتشاف لون الصورة)
src/components/item-card.tsx                       (محدث — دائرة اللون)
src/components/outfit-card.tsx                     (محدث — شريط Palette)
src/app/(app)/studio/page.tsx                      (محدث — قسم الحلقة)
src/app/(app)/outfits/[generationId]/page.tsx      (محدث — إصلاح type)
src/app/(app)/closet/page.tsx                      (محدث — إصلاح type)
src/lib/ai/stylist.ts                              (محدث — تناسق الألوان بالـ AI)
README.md                                          (محدث — جدول موديلات Groq)
