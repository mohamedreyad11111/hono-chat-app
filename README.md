# Hono Chat App with Cloudflare Workers

تطبيق محادثة مع نظام تسجيل وتسجيل دخول باستخدام Hono و Cloudflare Workers مع قاعدة بيانات D1.

## المميزات

- ✅ نظام تسجيل دخول وإنشاء حساب
- ✅ تطبيق محادثة في الوقت الفعلي
- ✅ واجهة عربية جميلة ومتجاوبة
- ✅ استخدام JWT للمصادقة
- ✅ تشفير كلمات المرور
- ✅ قاعدة بيانات D1 من Cloudflare
- ✅ جاهز للنشر على Cloudflare Workers

## البنية

```
hono-chat-app/
├── src/
│   └── index.js          # السيرفر الرئيسي مع الواجهات المدمجة
├── package.json          # إعدادات المشروع
├── wrangler.toml         # إعدادات Cloudflare Workers
├── schema.sql            # هيكل قاعدة البيانات
└── README.md             # هذا الملف
```

## خطوات التشغيل

### 1. رفع المشروع على GitHub

1. قم بتحميل جميع الملفات كـ ZIP
2. أنشئ مستودع جديد على GitHub
3. ارفع الملفات إلى المستودع

### 2. إعداد قاعدة البيانات D1

```bash
# إنشاء قاعدة بيانات D1 جديدة
wrangler d1 create chat_db

# تطبيق الهيكل
wrangler d1 execute chat_db --file=./schema.sql
```

### 3. تحديث wrangler.toml

قم بتحديث `database_id` في ملف `wrangler.toml` بالـ ID الذي حصلت عليه من الخطوة السابقة.

### 4. إعداد المتغيرات

في ملف `wrangler.toml`، قم بتغيير `JWT_SECRET` إلى قيمة سرية قوية:

```toml
[vars]
JWT_SECRET = "your-super-secret-jwt-key-here"
```

### 5. ربط GitHub مع Cloudflare Workers

1. اذهب إلى [Cloudflare Dashboard](https://dash.cloudflare.com)
2. اذهب إلى Workers & Pages
3. اختر "Create application"
4. اختر "Pages"
5. اربط حسابك على GitHub
6. اختر المستودع الذي رفعت عليه المشروع
7. اختر الإعدادات التالية:
   - Build command: `npm install` (أو اتركها فارغة)
   - Build output directory: `/`
   - Root directory: `/`

### 6. إعداد المتغيرات في Cloudflare

في إعدادات المشروع على Cloudflare:

1. اذهب إلى Settings → Environment variables
2. أضف المتغيرات التالية:
   - `JWT_SECRET`: المفتاح السري للـ JWT

### 7. ربط قاعدة البيانات

في إعدادات المشروع على Cloudflare:

1. اذهب إلى Settings → Functions
2. أضف D1 database binding:
   - Variable name: `DB`
   - D1 database: اختر `chat_db`

## الاستخدام

### الصفحات المتاحة

- `/` - صفحة تسجيل الدخول
- `/register` - صفحة إنشاء حساب جديد
- `/chat` - صفحة المحادثة (تتطلب تسجيل دخول)

### API Endpoints

- `POST /api/register` - إنشاء حساب جديد
- `POST /api/login` - تسجيل الدخول
- `GET /api/messages` - جلب الرسائل (مع المصادقة)
- `POST /api/messages` - إرسال رسالة (مع المصادقة)
- `GET /api/verify` - التحقق من صحة التوكن

## المميزات التقنية

- **Hono Framework**: سريع وخفيف للـ Edge Computing
- **JWT Authentication**: مصادقة آمنة بدون جلسات
- **bcryptjs**: تشفير كلمات المرور
- **D1 Database**: قاعدة بيانات SQLite على الحافة
- **Responsive Design**: واجهة متجاوبة مع جميع الأجهزة
- **Real-time Updates**: تحديث الرسائل كل 3 ثواني
- **Arabic Interface**: واجهة باللغة العربية مع دعم RTL

## الأمان

- كلمات المرور مشفرة باستخدام bcrypt
- استخدام JWT للمصادقة
- التحقق من صحة البيانات
- حماية من SQL Injection
- CORS enabled للـ API calls

## التطوير المستقبلي

يمكن إضافة المميزات التالية:
- إشعارات في الوقت الفعلي باستخدام WebSockets
- رفع الملفات والصور
- غرف محادثة متعددة
- نظام الأصدقاء
- إعدادات المستخدم

## الدعم

إذا واجهت أي مشاكل:
1. تأكد من أن جميع المتغيرات محددة بشكل صحيح
2. تأكد من أن قاعدة البيانات مربوطة بشكل صحيح
3. تحقق من logs في Cloudflare Dashboard

## الترخيص

هذا المشروع مفتوح المصدر ومتاح للاستخدام الحر.