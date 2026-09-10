```javascript
const BOT_TOKEN = "8884039751:AAGARs0kjBwqBwWwxh6EDWEgxO0EnMRVivM";

const CHANNEL = "@apolloagency";

const CHANNEL_URL =
  "https://t.me/apolloagency";

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

      const update =
        await request.json();

      console.log(
        "UPDATE:",
        JSON.stringify(update)
      );

      // Обычное сообщение
      if (update.message) {

        await processMessage(
          update.message
        );

      }

      // Нажатие inline-кнопки
      if (update.callback_query) {

        await processCallback(
          update.callback_query
        );

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

  const response =
    await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(data)
      }
    );

  const result =
    await response.json();

  console.log(
    "API",
    method,
    JSON.stringify(result)
  );

  return result;
}


// ==========================================
// ПРОВЕРКА ПОДПИСКИ
// ==========================================

async function isSubscribed(
  userId
) {

  const result =
    await telegram(
      "getChatMember",
      {
        chat_id:
          CHANNEL,

        user_id:
          userId
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
// КНОПКИ ДЛЯ ПОДПИСКИ
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
// КНОПКА ВИДЕО
// ==========================================

function videoButton() {

  return {

    inline_keyboard: [

      [
        {
          text:
            "🎬 СМОТРЕТЬ ВИДЕО",

          url:
            VIDEO_URL
        }
      ]

    ]
  };
}


// ==========================================
// ОТПРАВИТЬ ПРОСЬБУ ПОДПИСАТЬСЯ
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
        "Чтобы получить видео, сначала подпишись на канал:\n\n" +
        "📢 https://t.me/apolloagency\n\n" +
        "После подписки нажми кнопку ниже.",

      reply_markup:
        subscribeButtons()
    }
  );
}


// ==========================================
// ОТПРАВИТЬ ДОСТУП К ВИДЕО
// ==========================================

async function sendVideoMessage(
  chatId
) {

  await telegram(
    "sendMessage",
    {

      chat_id:
        chatId,

      text:
        "✅ ПОДПИСКА ПОДТВЕРЖДЕНА\n\n" +
        "Доступ к видео открыт.",

      reply_markup:
        videoButton()
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

  await sendVideoMessage(
    chatId
  );
}


// ==========================================
// ПРОВЕРКА ПО КНОПКЕ
// ==========================================

async function processCallback(
  callback
) {

  if (!callback.data) {
    return;
  }


  if (
    callback.data !==
    "verify_subscription"
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
    "VERIFY:",
    userId
  );


  // ======================================
  // ПРОВЕРЯЕМ ПОДПИСКУ ЗАНОВО
  // ======================================

  const subscribed =
    await isSubscribed(
      userId
    );


  // ======================================
  // ПОДПИСАН
  // ======================================

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
          "✅ ПОДПИСКА ПОДТВЕРЖДЕНА\n\n" +
          "Доступ к видео открыт.",

        reply_markup:
          videoButton()
      }
    );


    return;
  }


  // ======================================
  // НЕ ПОДПИСАН
  // ======================================

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
```
