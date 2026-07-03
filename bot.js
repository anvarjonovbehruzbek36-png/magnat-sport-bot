const fs = require('fs');
const path = require('path');

// 1. .env faylidan o'zgaruvchilarni yuklash funksiyasi
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.substring(1, value.length - 1);
          }
          process.env[key] = value.trim();
        }
      });
    }
  } catch (e) {
    console.error("Error loading .env file:", e);
  }
}

// Atrof-muhit o'zgaruvchilarini yuklash
loadEnv();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!TELEGRAM_BOT_TOKEN) {
  console.error("Xatolik: TELEGRAM_BOT_TOKEN .env faylida topilmadi!");
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error("Xatolik: GEMINI_API_KEY .env faylida topilmadi!");
  process.exit(1);
}

// 2. Tizimli yo'riqnomalar (System Instruction)
const SYSTEM_INSTRUCTION = 
  "Siz 'Magnat' sport do'koni sotuvchi agenti Alisiz. Quyidagi qoidalarga qat'iy amal qiling:\n" +
  "1. Faqat suhbat boshida (birinchi xabarda) mijoz bilan samimiy salomlashing. Keyingi xabarlarda qayta-qayta salomlashmang ('salom', 'assalomu alaykum' deb takrorlamang), balki to'g'ridan-to'g'ri suhbatni davom ettirib javob bering.\n" +
  "2. Savollarga faqat o'zbek tilida javob bering.\n" +
  "3. Javoblaringiz doimo juda qisqa bo'lsin: faqat 1 yoki 2 ta gapdan oshmasin.\n" +
  "4. Do'konda sport kiyimlari, poyabzallar, gantellar, koptoklar, turniklar, trenajyorlar va boshqa sport jihozlari borligini aytib, mahsulotlarni tushuntiring va sotishga harakat qiling.\n" +
  "5. Agar foydalanuvchi sizdan 'Sen botmisan?' yoki shunga o'xshash botlik haqida so'rasa, QAT'IY ravishda: 'Yo'q, man Aliman shu dokonda ishlayman' deb javob bering. Hech qachon o'zingizni sun'iy intellekt yoki AI deb atamang.\n" +
  "6. Har doim o'zingizni haqiqiy inson kabi tuting va sotuvni muvaffaqiyatli yakunlashga harakat qiling.";

// Suhbat tarixini saqlash uchun ob'ekt
const chatHistories = {};
let offset = 0;

// 3. Telegram xabarini yuborish
async function sendTelegramMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text })
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`Telegram xabar yuborishda xatolik: ${response.status} - ${errText}`);
    }
  } catch (err) {
    console.error("Telegram bilan ulanishda xatolik:", err);
  }
}

// 4. Gemini API orqali javob olish (REST API)
async function askGemini(history) {
  // Modellarni zaxira bilan ishlatamiz (agar bittasi band bo'lsa, ikkinchisiga o'tadi)
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  
  for (const modelName of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
    
    const payload = {
      contents: history,
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      }
    };

    const maxRetries = 2; // Har bir model uchun 2 marta urinish
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        // 503 (server band) yoki 429 (so'rovlar limiti) xatolari bo'lsa qayta urinib ko'ramiz
        if (response.status === 503 || response.status === 429) {
          attempt++;
          if (attempt < maxRetries) {
            console.warn(`${modelName} API ${response.status} xatosini berdi. 1 soniyadan keyin qayta urinib ko'ramiz...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`${modelName} xatosi: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
          return data.candidates[0].content.parts[0].text.trim();
        }
        
        throw new Error("Gemini API dan yaroqsiz javob shakli");
      } catch (err) {
        console.warn(`${modelName} modelining ${attempt + 1}-urinishi xato tugadi: ${err.message}`);
        if (attempt < maxRetries - 1) {
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // Bu model uchun urinishlar tugadi, keyingi modelga o'tiladi
          break;
        }
      }
    }
  }
  
  throw new Error("Barcha zaxira Gemini modellari ishlamay qoldi");
}

// 5. Xabarlarni qayta ishlash
async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = message.text;
  if (!text) return;

  console.log(`[Foydalanuvchi ${chatId}]: ${text}`);

  // /start buyrug'i kelganda
  if (text.startsWith('/start')) {
    chatHistories[chatId] = [];
    const welcome = "Assalomu alaykum! Men 'Magnat' sport do'koni sotuvchisi Aliman. Sizga qanday sport jihozi yoki kiyimi kerak? Yordam berishdan xursandman!";
    await sendTelegramMessage(chatId, welcome);
    return;
  }

  // "botmisan" tekshiruvi (o'zbekcha turli ko'rinishlar)
  const cleanedText = text.toLowerCase().replace(/['`’‘-]/g, '');
  const isBotQuestion = 
    cleanedText.includes('botmisan') || 
    cleanedText.includes('botmisiz') || 
    cleanedText.includes('botsan') || 
    cleanedText.includes('botsiz') || 
    cleanedText.includes('robot') || 
    cleanedText.includes('suniyintellekt') ||
    cleanedText.includes('aimisan') ||
    cleanedText.includes('aimisiz');

  if (isBotQuestion) {
    const botReply = "Yo'q, man Aliman shu dokonda ishlayman";
    console.log(`[Botmisan tekshiruvi]: ${botReply}`);
    await sendTelegramMessage(chatId, botReply);
    return;
  }

  // Agar suhbat tarixi mavjud bo'lmasa
  if (!chatHistories[chatId]) {
    chatHistories[chatId] = [];
  }

  // Xabarni tarixga qo'shish
  chatHistories[chatId].push({
    role: 'user',
    parts: [{ text: text }]
  });

  // Tarix hajmini cheklash (oxirgi 10 ta suhbat tsikli)
  if (chatHistories[chatId].length > 20) {
    chatHistories[chatId] = chatHistories[chatId].slice(-20);
  }

  try {
    let replyText = await askGemini(chatHistories[chatId]);
    
    // Xavfsizlik uchun: agar model tasodifan o'zini AI yoki bot deb javob bersa
    const lowerReply = replyText.toLowerCase().replace(/['`’‘-]/g, '');
    if (
      lowerReply.includes('suniyintellekt') || 
      lowerReply.includes('botman') || 
      lowerReply.includes('til modeli') || 
      lowerReply.includes('yordamchiman') || 
      lowerReply.includes('assistentman')
    ) {
      replyText = "Yo'q, man Aliman shu dokonda ishlayman";
    }

    // Javobni tarixga qo'shish
    chatHistories[chatId].push({
      role: 'model',
      parts: [{ text: replyText }]
    });

    await sendTelegramMessage(chatId, replyText);
    console.log(`[Bot (Ali) -> ${chatId}]: ${replyText}`);
  } catch (err) {
    console.error("Gemini yoki Telegram API xatosi:", err);
    await sendTelegramMessage(chatId, "Uzr, biroz aloqa yaxshi emas. Do'konimizda qanday sport jihozi qidirayotgan edingiz?");
  }
}

// 6. Polling (Telegram dan xabarlarni doimiy olish)
async function pollUpdates() {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Telegram server javob bermadi: ${res.statusText}`);
    }
    const data = await res.json();
    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        offset = update.update_id + 1;
        if (update.message) {
          await handleMessage(update.message);
        }
      }
    }
  } catch (err) {
    console.error("Polling jarayonida xatolik:", err);
    // Xatolik yuz berganda 5 soniya kutib qayta urunadi
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // Keyingi polling
  setImmediate(pollUpdates);
}

// Botni ishga tushirish
console.log("Magnat Sport Telegram boti ishga tushmoqda...");
console.log("Tizim: Node.js (Agy-Node)");
pollUpdates();
