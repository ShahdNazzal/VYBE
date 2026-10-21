VYBE — دليل النشر على Vercel + Supabase (مجاني)
=====================================================

شو هاد الباك؟
-------------
١٣ ملف بس — بتنسخيهم فوق الكود الموجود عندك (زي باك الحلقة بالضبط).
بعد هيك موقعك بيصير يشتغل بطريقتين بنفس الكود:
  • محلياً (بدون مفاتيح Supabase): قاعدة SQLite + صور محلية — بالضبط زي ما كان، ما بيتبدل ولا إشي.
  • مع مفاتيح Supabase: قاعدة PostgreSQL + صور عالسحابة — وهذا يلي منستخدمه لفيرسل.

خطوة 0 — نسخة احتياطية (٣٠ ثانية)
----------------------------------
كليك يمين على فولدر مشروعك → Send to → Compressed (zipped) folder.
خلاص، مهما صار ما في فقدان بيانات.

خطوة 1 — مشروع Supabase (مجاني، ٥ دقائق)
------------------------------------------
1. supabase.com → Sign up → New project (اسم: vybe — وخلي الباسورد اللي بيطالبك فيه
   بمكان أمان لأنه رح تحتاجيه، واختاري Region قريب: Frankfurt).
2. بعد ما يجهز المشروع: اضغطي زر **Connect** بالأعلى — رح تلاقي سطور جاهزة للنسخ:
   • خذي سطر **Transaction pooler** (فيه رقم منفذ 6543) → هذا DATABASE_URL
   • خذي سطر **Session pooler** (فيه رقم منفذ 5432) → هذا DIRECT_URL
3. Project Settings → API Keys:
   • خذي **Project URL** → هذا SUPABASE_URL
   • خذي مفتاح **service_role** (السري!) → هذا SUPABASE_SERVICE_ROLE_KEY
     ⚠️ هاد المفتاح سري جداً — ما تنزليه عالشات ولا عأي مكان عام.

خطوة 2 — عدلي ملف .env عندك
----------------------------
افتحي .env بالنوت باد وخليه هيك (احتفظي بقيمك أنتِ للأمان والمفتاح):
  DATABASE_URL="...اللي نسختيه من Transaction pooler 6543..."
  DIRECT_URL="...اللي نسختيه من Session pooler 5432..."
  AUTH_SECRET="نفس القيمة الموجودة عندك ما تنلمس"
  OPENAI_API_KEY="نفس مفتاح Groq تبعك"
  OPENAI_BASE_URL="https://api.groq.com/openai/v1"
  OPENAI_MODEL="llama-3.1-8b-instant"
  SUPABASE_URL="https://xxxx.supabase.co"
  SUPABASE_SERVICE_ROLE_KEY="eyJ..."

خطوة 3 — انسخي ملفات الباك فوق مشروعك
--------------------------------------
حددي كل محتويات فولدر vybe-vercel (اللي جوا هاد الملف المضغوط) → Ctrl+C
→ روحي لفولدر مشروعك → Ctrl+V → اختاري "Replace the files in the destination".

خطوة 4 — منشئي الجداول عالسوبابيز (مرة وحدة بس)
------------------------------------------------
بالترمنال بمشروعك:
  npx prisma db push
رح ينشئ الجداول بقاعدة Supabase (ممكن ياخذ دقيقة أول مرة).

خطوة 5 — تجربة محلية
---------------------
  npx next dev -p 3000
سجلي حساب جديد → خزانة البداية بضغطة → ارفعي صورة → ولدي إطلالة.
✅ لاحظي: البيانات القديمة بالـ SQLite ما بتنتقل أوتوماتيك (بس خزانة بداية ورفع صور
جديد — بعشر دقائق كل شي رجع). الصور القديمة يلي كانت مرفوعة ما بتظهر بعد اليوم.
(اختياري: جرّبي node scripts/test-supabase-storage.mjs — لازم يطبع SUCCESS ورابط.)

خطوة 6 — ارفعي الكود ع GitHub
------------------------------
.gitignore محدث — .env وdb وuploads ما رح ينرفعوا أبداً (مفاتيحك بأمان).
ب GitHub Desktop أو بالترمنال:
  git init
  git add .
  git commit -m "VYBE ready for Vercel"
  git branch -M main
  git remote add origin https://github.com/USERNAME/REPO.git
  git push -u origin main

خطوة 7 — فيرسل (مجاني)
-----------------------
1. vercel.com → Sign up with GitHub → Add New... → Project → Import مستودعك.
2. قبل ما تضغطي Deploy: افتحي **Environment Variables** وحطي الـ 8 قيم
   (نفس القيم اللي بـ .env عندك حرفياً):
   DATABASE_URL / DIRECT_URL / AUTH_SECRET / OPENAI_API_KEY /
   OPENAI_BASE_URL / OPENAI_MODEL / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
3. Deploy → استني دقيقتين → عندك رابط حي تشتغلي وتشاركيه 🎉

إذا صار خطأ — الأكثر شيوعاً
---------------------------
• "Can't reach database server" أو ENETUNREACH وقت db push:
  → خليكت DIRECT_URL من سطر غلط. لازم يكون Session pooler (5432) مو Direct connection.
• رفع صورة بيفشل 404/400 عفيرسل:
  → SUPABASE_URL أو service_role_key ناقصين/غلطين بـ Environment Variables.
• توليد الإطلالات بيرجع Rule-based stylist دايماً:
  → افتحي Vercel → Logs وشوفي الرسالة [stylist] — غالباً اسم الموديل (404) او المفتاح (401).
• Build بيفشل بفيرسل:
  → تأكدي إنو package.json فيه postinstall: prisma generate (موجود بالباك).

ملاحظات أمانة
--------------
• خطة Supabase المجانية: بتتوقف مؤقتاً بعد أسبوع بدون أي استخدام — بترجعيها بضغطة
  من لوحة Supabase (Restore) بدون فقدان بيانات. موقع حي باستخدام يومي ما بيتوقف.
• فيرسل Hobby مجاني للاستخدام الشخصي/البورتفوليو.
• عفيرسل توليد الـ AI عنده مهلة أقصر (40 ثانية محاولة وحدة) — إذا Groq تأخر،
  بيرجع الـ rule-based stylist بشفافية زي العادة.
• فيديو الديمو: صوري من localhost أو من رابط فيرسل — الاثنين بيشتغلوا.
