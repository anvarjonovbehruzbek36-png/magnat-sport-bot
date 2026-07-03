# "Magnat" Sport Do'koni Sotuv Agent Telegram Boti

Ushbu bot "Magnat" sport do'koni uchun sotuvchi agent ("Ali") rolida ishlaydi. Bot mijozlar savollariga o'zbek tilida, qisqa (1-2 gap) va insoniy tarzda javob beradi.

Bot hech qanday tashqi kutubxonalarsiz (zero dependencies) ishlaydi va Telegram API hamda Gemini API bilan to'g'ridan-to'g'ri bog'lanadi.

## Xususiyatlari
- O'zini haqiqiy inson ("Ali") deb ko'rsatadi.
- Bot ekanligi so'ralganda: `"Yo'q, man Aliman shu dokonda ishlayman"` deb javob beradi.
- Doimo qisqa va aniq gapiradi.
- Har bir foydalanuvchining suhbat tarixini xotirada saqlaydi.
- Yuklamalar oshganda avtomatik qayta urinish (retry) va zaxira modelga o'tish (fallback) tizimiga ega.

## Mahalliy Sozlash (`.env`)
Loyiha papkasida `.env` faylini yarating va quyidagi kalitlarni yozing:
- `TELEGRAM_BOT_TOKEN`: Telegram botingiz tokeni.
- `GEMINI_API_KEY`: Google Gemini API kalitingiz.

## Mahalliy Ishga Tushirish
Botni Node.js orqali ishga tushirish:
```bash
npm start
```

---

## Deploy (Serverga Joylashtirish) Yo'riqnomasi

Botni 24/7 rejimida ishlashi uchun serverga (VPS) yoki PaaS platformalariga joylashtirish mumkin.

### 1-Usul: VPS Serverda PM2 orqali (Tavsiya etiladi)
Agar sizda Ubuntu/Debian VPS bo'lsa, Node.js va `pm2` yordamida botni fonda doimiy ishlaydigan qilish mumkin:

1. Serverga Node.js va npm ni o'rnating.
2. PM2 (Process Manager) ni o'rnating:
   ```bash
   sudo npm install -g pm2
   ```
3. Bot kodini serverga yuklang (git yoki scp orqali).
4. Loyiha papkasiga o'tib, botni PM2 yordamida ishga tushiring:
   ```bash
   pm2 start bot.js --name "magnat-sport-bot"
   ```
5. Server o'chib-yonkanda bot avtomatik ishga tushishi uchun:
   ```bash
   pm2 startup
   pm2 save
   ```

### 2-Usul: VPS Serverda Docker Compose orqali
Agar serveringizda Docker o'rnatilgan bo'lsa, botni konteyner ichida ishga tushirish eng xavfsiz va toza yo'ldir:

1. Loyiha papkasiga o'ting.
2. Quyidagi buyruqni ishga tushiring:
   ```bash
   docker-compose up -d --build
   ```
Bu buyruq fonda botni yuklab, ishga tushiradi va server o'chib yonganda ham avtomatik qayta ishga tushadigan qiladi.

### 3-Usul: Render, Railway yoki Heroku orqali (Bepul/PaaS)
Ushbu platformalarda server sozlash talab qilinmaydi:

1. Kodni o'zingizning GitHub repozitoriyingizga yuklang (lekin `.env` faylini yuklamang!).
2. Platformada (masalan, [Render.com](https://render.com)) yangi **Web Service** yoki **Background Worker** yarating va GitHub profilingizni ulab, ushbu repozitoriyani tanlang.
3. Sozlamalarda:
   - **Environment Variables** (yoki Config Vars) qismida `.env` ichidagi `TELEGRAM_BOT_TOKEN` va `GEMINI_API_KEY` o'zgaruvchilarini qo'shing.
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Deploy tugmasini bosing. Loyiha avtomatik ishga tushadi.
