// ================================
// TELEGRAM BOT
// @panterafulls_bot
// ================================

// ВСТАВЬ СЮДА ТОКЕН ОТ @BotFather
const BOT_TOKEN = "8884039751:AAGARs0kjBwqBwWwxh6EDWEgxO0EnMRVivM";

// Канал, на который пользователь должен подписаться
const CHANNEL = "@panteraprimes";

// Ссылка на видео
const VIDEO_URL =
  "https://upload18.org/play/index/c4304e71625d";


export default {
  async fetch(request, env) {

    // Проверяем, что Worker получает POST от Telegram
    if (request.method !== "POST") {
      return new Response("Bot is running");
    }

    try {

      const update = await request.json();

      // Обычное сообщение /start
      if (update.message) {
        await handleMessage(update.message);
      }

      // Нажатие inline-кнопки
      if (update.callback_query) {
        await handleCallback(update.callback_query);
      }

      return new Response("OK");

    } catch (error) {

      console.error("BOT ERROR:", error);

      return new Response("ERROR", {
        status: 500
      });
    }
  }
};


// ========================================
// TELEGRAM API
// ========================================

async function telegram(method, params) {

  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(params)
    }
  );

  const data = await response.json();

  console.log("Telegram:", method, data);

  return data;
}


// ========================================
// ПРОВЕРКА ПОДПИСКИ
// ========================================

async function checkSubscription(userId) {

  try {

    const result = await telegram(
      "getChatMember",
      {
        chat_id: CHANNEL,
        user_id: userId
      }
    );

    if (!result.ok) {

      console.error(
        "Ошибка getChatMember:",
        result
      );

      return false;
    }

    const status = result.result.status;

    console.log(
      "User:",
      userId,
      "Status:",
      status
    );

    // Пользователь подписан
    if (
      status === "member" ||
      status === "administrator" ||
      status === "creator"
    ) {
      return true;
    }

    // Не подписан / вышел / заблокирован
    return false;

  } catch (error) {

    console.error(
      "Ошибка проверки подписки:",
      error
    );

    return false;
  }
}


// ========================================
// КЛАВИАТУРА ПОДПИСКИ
// ========================================

function subscriptionKeyboard() {

  return {

    inline_keyboard: [

      [
        {
          text: "📢 Подписаться на канал",
          url: "https://t.me/panteraprimes"
        }
      ],

      [
        {
          text: "✅ Проверить подписку",
          callback_data: "check_subscription"
        }
      ]

    ]
  };
}


// ========================================
// КЛАВИАТУРА ВИДЕО
// ========================================

function videoKeyboard() {

  return {

    inline_keyboard: [

      [
        {
          text: "🎬 Смотреть видео",
          url: VIDEO_URL
        }
      ]

    ]
  };
}


// ========================================
// СООБЩЕНИЕ ЕСЛИ НЕ ПОДПИСАН
// ========================================

async function sendSubscriptionMessage(chatId) {

  await telegram(
    "sendMessage",
    {

      chat_id: chatId,

      text:
        "🔒 Доступ к видео закрыт.\n\n" +
        "Чтобы получить доступ, подпишись на канал:\n\n" +
        "📢 @panteraprimes\n\n" +
        "После подписки нажми кнопку «Проверить подписку».",

      reply_markup:
        subscriptionKeyboard()

    }
  );
}


// ========================================
// СООБЩЕНИЕ ЕСЛИ ПОДПИСАН
// ========================================

async function sendVideoMessage(chatId) {

  await telegram(
    "sendMessage",
    {

      chat_id: chatId,

      text:
        "✅ Подписка подтверждена!\n\n" +
        "🎬 Доступ к видео открыт.",

      reply_markup:
        videoKeyboard()

    }
  );
}


// ========================================
// ОБРАБОТКА /START
// ========================================

async function handleMessage(message) {

  if (!message.from) {
    return;
  }

  if (!message.chat) {
    return;
  }

  // Обрабатываем только /start
  if (
    message.text &&
    message.text.startsWith("/start")
  ) {

    const userId =
      message.from.id;

    const chatId =
      message.chat.id;


    console.log(
      "START:",
      userId,
      message.text
    );


    // Проверяем подписку
    const subscribed =
      await checkSubscription(userId);


    if (subscribed) {

      await sendVideoMessage(chatId);

    } else {

      await sendSubscriptionMessage(chatId);

    }
  }
}


// ========================================
// ОБРАБОТКА КНОПКИ
// "ПРОВЕРИТЬ ПОДПИСКУ"
// ========================================

async function handleCallback(callback) {

  if (
    callback.data !==
    "check_subscription"
  ) {
    return;
  }


  const userId =
    callback.from.id;


  const chatId =
    callback.message.chat.id;


  const messageId =
    callback.message.message_id;


  console.log(
    "CHECK:",
    userId
  );


  // Проверяем подписку
  const subscribed =
    await checkSubscription(userId);


  // ======================================
  // ПОДПИСАН
  // ======================================

  if (subscribed) {


    // Убираем "часики" с кнопки
    await telegram(
      "answerCallbackQuery",
      {
        callback_query_id:
          callback.id,

        text:
          "✅ Подписка подтверждена!"
      }
    );


    // Меняем старое сообщение
    await telegram(
      "editMessageText",
      {

        chat_id:
          chatId,

        message_id:
          messageId,

        text:
          "✅ Подписка подтверждена!\n\n" +
          "🎬 Доступ к видео открыт.",

        reply_markup:
          videoKeyboard()

      }
    );


  }

  // ======================================
  // НЕ ПОДПИСАН
  // ======================================

  else {


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

  }
}
