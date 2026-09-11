const BOT_TOKEN = "8884039751:AAGARs0kjBwqBwWwxh6EDWEgxO0EnMRVivM";

const CHANNEL = "@workfortou";

const CHANNEL_URL =
  "https://t.me/workfortou";

const FANSLY_URL =
  "https://ladys.edvard7789.workers.dev/";

const VIDEO_URL =
  "https://upload18.org/play/index/c4304e71625d";


// ==========================================
// CLOUDFLARE WORKER
// ==========================================

export default {
  async fetch(request) {

    if (request.method !== "POST") {
      return new Response("OK");
    }

    try {

      const update = await request.json();

      console.log(
        "UPDATE:",
        JSON.stringify(update)
      );

      // Обычное сообщение
      if (update.message) {
        await processMessage(update.message);
      }

      // Нажатие inline-кнопки
      if (update.callback_query) {
        await processCallback(update.callback_query);
      }

      return new Response("OK");

    } catch (error) {

      console.error(
        "ERROR:",
        error
      );

      return new Response(
        "ERROR",
        {
          status: 500
        }
      );
    }
  }
};


// ==========================================
// TELEGRAM API
// ==========================================

async function telegram(
  method,
  data
) {

  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(data)
    }
  );

  const result = await response.json();

  console.log(
    "API",
    method,
    JSON.stringify(result)
  );

  return result;
}


// ==========================================
// ПРОВЕРКА ПОДПИСКИ НА КАНАЛ
// ==========================================

async function isSubscribed(
  userId
) {

  const result = await telegram(
    "getChatMember",
    {
      chat_id: CHANNEL,
      user_id: userId
    }
  );

  if (!result.ok) {

    console.error(
      "getChatMember failed:",
      JSON.stringify(result)
    );

    return false;
  }

  const status =
    result.result.status;

  console.log(
    "USER:",
    userId,
    "STATUS:",
    status
  );

  return (
    status === "member" ||
    status === "administrator" ||
    status === "creator"
  );
}


// ==========================================
// КНОПКИ ПОДПИСКИ НА TELEGRAM
// ==========================================

function subscribeButtons() {

  return {

    inline_keyboard: [

      [
        {
          text:
            "📢 ПОДПИСАТЬСЯ НА КАНАЛ",

          url:
            CHANNEL_URL
        }
      ],

      [
        {
          text:
            "✅ Я ПОДПИСАЛСЯ — ПРОВЕРИТЬ",

          callback_data:
            "verify_subscription"
        }
      ]

    ]
  };
}


// ==========================================
// КНОПКА FANSLY
// ==========================================

function fanslyButton() {

  return {

    inline_keyboard: [

      [
        {
          text:
            "🔵 ОТКРЫТЬ FANSLY",

          url:
            FANSLY_URL
        }
      ],

      [
        {
          text:
            "📸 Я ОТПРАВИЛ СКРИНШОТ",

          callback_data:
            "screenshot_sent"
        }
      ]

    ]
  };
}


// ==========================================
// КНОПКА ПОЛНОГО ВИДЕО
// ==========================================

function videoButton() {

  return {

    inline_keyboard: [

      [
        {
          text:
            "🎬 СМОТРЕТЬ ПОЛНОЕ ВИДЕО",

          url:
            VIDEO_URL
        }
      ]

    ]
  };
}


// ==========================================
// СООБЩЕНИЕ: НЕТ ПОДПИСКИ
// ==========================================

async function sendSubscribeMessage(
  chatId
) {

  await telegram(
    "sendMessage",
    {

      chat_id:
        chatId,

      text:
        "🔒 ДОСТУП ЗАКРЫТ\n\n" +

        "Чтобы получить доступ к полному видео, сначала подпишись на наш Telegram-канал.\n\n" +

        "📢 Канал:\n" +
        "https://t.me/workfortou\n\n" +

        "После подписки нажми кнопку:\n" +
        "«Я ПОДПИСАЛСЯ — ПРОВЕРИТЬ»",

      reply_markup:
        subscribeButtons()
    }
  );
}


// ==========================================
// СООБЩЕНИЕ С УСЛОВИЯМИ FANSLY
// ==========================================

async function sendFanslyMessage(
  chatId
) {

  await telegram(
    "sendMessage",
    {

      chat_id:
        chatId,

      text:
        "✅ ПОДПИСКА НА TELEGRAM ПОДТВЕРЖДЕНА!\n\n" +

        "Теперь осталось выполнить несколько простых условий для получения полного видео 👇\n\n" +

        "1️⃣ Открой страницу Fansly по кнопке ниже.\n\n" +

        "2️⃣ Пройди быструю регистрацию.\n\n" +

        "3️⃣ В ВЕРХУ СПРАВА нажми СИНЮЮ кнопку подписки.\n\n" +

        "🔵 ПОДПИСКА БЕСПЛАТНАЯ — ПЛАТИТЬ НИЧЕГО НЕ НУЖНО.\n\n" +

        "4️⃣ После подписки поставь ❤️ ЛАЙК ВСЕМ ПУБЛИКАЦИЯМ на странице.\n\n" +

        "5️⃣ Сделай СКРИНШОТ, на котором видно выполнение условий.\n\n" +

        "6️⃣ Отправь скриншот пользователю @frgnoo.\n\n" +

        "7️⃣ После проверки выполнения условий тебе будет предоставлена ссылка на ПОЛНОЕ ВИДЕО.\n\n" +

        "⚠️ ВАЖНО:\n" +
        "Не отправляй несколько одинаковых скриншотов. Достаточно одного нормального скриншота, на котором видно выполнение условий.\n\n" +

        "👇 НАЖМИ КНОПКУ НИЖЕ, ЧТОБЫ НАЧАТЬ:",

      reply_markup:
        fanslyButton()
    }
  );
}


// ==========================================
// ОБРАБОТКА /START
// ==========================================

async function processMessage(
  message
) {

  if (!message.from) {
    return;
  }

  if (!message.chat) {
    return;
  }

  if (!message.text) {
    return;
  }

  const text =
    message.text.trim();

  if (!text.startsWith("/start")) {
    return;
  }

  const userId =
    message.from.id;

  const chatId =
    message.chat.id;

  console.log(
    "START FROM:",
    userId,
    text
  );


  // ======================================
  // ПРОВЕРЯЕМ ПОДПИСКУ
  // ======================================

  const subscribed =
    await isSubscribed(
      userId
    );


  // ======================================
  // НЕ ПОДПИСАН
  // ======================================

  if (!subscribed) {

    await sendSubscribeMessage(
      chatId
    );

    return;
  }


  // ======================================
  // ПОДПИСАН
  // ======================================

  await sendFanslyMessage(
    chatId
  );
}


// ==========================================
// CALLBACK-КНОПКИ
// ==========================================

async function processCallback(
  callback
) {

  if (!callback.data) {
    return;
  }

  if (!callback.from) {
    return;
  }

  const userId =
    callback.from.id;

  const chatId =
    callback.message.chat.id;

  const messageId =
    callback.message.message_id;


  // ======================================
  // ПРОВЕРКА ПОДПИСКИ
  // ======================================

  if (
    callback.data ===
    "verify_subscription"
  ) {

    console.log(
      "VERIFY SUBSCRIPTION:",
      userId
    );


    const subscribed =
      await isSubscribed(
        userId
      );


    // ====================================
    // ПОДПИСАН
    // ====================================

    if (subscribed) {

      await telegram(
        "answerCallbackQuery",
        {

          callback_query_id:
            callback.id,

          text:
            "✅ Подписка подтверждена!"
        }
      );


      await telegram(
        "editMessageText",
        {

          chat_id:
            chatId,

          message_id:
            messageId,

          text:
            "✅ ПОДПИСКА НА TELEGRAM ПОДТВЕРЖДЕНА!\n\n" +

            "Теперь осталось выполнить несколько простых условий для получения полного видео 👇\n\n" +

            "1️⃣ Открой страницу Fansly по кнопке ниже.\n\n" +

            "2️⃣ Пройди быструю регистрацию.\n\n" +

            "3️⃣ В ВЕРХУ СПРАВА нажми СИНЮЮ кнопку подписки.\n\n" +

            "🔵 ПОДПИСКА БЕСПЛАТНАЯ — ПЛАТИТЬ НИЧЕГО НЕ НУЖНО.\n\n" +

            "4️⃣ После подписки поставь ❤️ ЛАЙК ВСЕМ ПУБЛИКАЦИЯМ на странице.\n\n" +

            "5️⃣ Сделай СКРИНШОТ, на котором видно выполнение условий.\n\n" +

            "6️⃣ Отправь скриншот пользователю @frgnoo.\n\n" +

            "7️⃣ После проверки выполнения условий тебе будет предоставлена ссылка на ПОЛНОЕ ВИДЕО.\n\n" +

            "⚠️ ВАЖНО:\n" +
            "Не отправляй несколько одинаковых скриншотов. Достаточно одного нормального скриншота, на котором видно выполнение условий.\n\n" +

            "👇 НАЖМИ КНОПКУ НИЖЕ, ЧТОБЫ НАЧАТЬ:",

          reply_markup:
            fanslyButton()
        }
      );

      return;
    }


    // ====================================
    // НЕ ПОДПИСАН
    // ====================================

    await telegram(
      "answerCallbackQuery",
      {

        callback_query_id:
          callback.id,

        text:
          "❌ Ты ещё не подписан на канал.",

        show_alert:
          true
      }
    );

    return;
  }


  // ======================================
  // КНОПКА «Я ОТПРАВИЛ СКРИНШОТ»
  // ======================================

  if (
    callback.data ===
    "screenshot_sent"
  ) {

    console.log(
      "SCREENSHOT SENT:",
      userId
    );


    await telegram(
      "answerCallbackQuery",
      {

        callback_query_id:
          callback.id,

        text:
          "📸 Информация получена!"
      }
    );


    await telegram(
      "sendMessage",
      {

        chat_id:
          chatId,

        text:
          "📸 СКРИНШОТ ОТПРАВЛЕН НА ПРОВЕРКУ\n\n" +

          "Если ты ещё не отправил скриншот, отправь его пользователю:\n" +
          "@frgnoo\n\n" +

          "После проверки выполнения всех условий тебе будет предоставлена ссылка на полное видео.\n\n" +

          "⏳ Пожалуйста, дождись проверки."
      }
    );

    return;
  }
}
