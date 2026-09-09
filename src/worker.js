const CHANNEL = "@panteraprimes";
const VIDEO_URL = "https://upload18.org/play/index/c4304e71625d";

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Bot is running");
    }

    try {
      const update = await request.json();

      if (update.message) {
        await handleMessage(update.message, env);
      }

      if (update.callback_query) {
        await handleCallback(update.callback_query, env);
      }

      return new Response("OK");
    } catch (error) {
      console.error(error);
      return new Response("ERROR", { status: 500 });
    }
  }
};


async function telegram(method, params, env) {
  const response = await fetch(
    `https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(params)
    }
  );

  return await response.json();
}


async function checkSubscription(userId, env) {
  const result = await telegram(
    "getChatMember",
    {
      chat_id: CHANNEL,
      user_id: userId
    },
    env
  );

  if (!result.ok) {
    console.error(result);
    return false;
  }

  const status = result.result.status;

  return (
    status === "member" ||
    status === "administrator" ||
    status === "creator"
  );
}


async function sendSubscriptionMessage(chatId, env) {
  await telegram(
    "sendMessage",
    {
      chat_id: chatId,
      text:
        "🔒 Чтобы получить доступ к видео, подпишись на канал.\n\n" +
        "После подписки нажми «✅ Проверить подписку».",
      reply_markup: {
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
              callback_data: "check"
            }
          ]
        ]
      }
    },
    env
  );
}


async function sendVideoMessage(chatId, env) {
  await telegram(
    "sendMessage",
    {
      chat_id: chatId,
      text:
        "✅ Подписка подтверждена!\n\n" +
        "🎬 Доступ к видео открыт.",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🎬 Смотреть видео",
              url: VIDEO_URL
            }
          ]
        ]
      }
    },
    env
  );
}


async function handleMessage(message, env) {
  if (!message.from || !message.chat) return;

  if (message.text && message.text.startsWith("/start")) {
    const subscribed = await checkSubscription(
      message.from.id,
      env
    );

    if (subscribed) {
      await sendVideoMessage(message.chat.id, env);
    } else {
      await sendSubscriptionMessage(message.chat.id, env);
    }
  }
}


async function handleCallback(callback, env) {
  if (callback.data !== "check") return;

  const subscribed = await checkSubscription(
    callback.from.id,
    env
  );

  if (subscribed) {
    await telegram(
      "answerCallbackQuery",
      {
        callback_query_id: callback.id,
        text: "✅ Подписка подтверждена!"
      },
      env
    );

    await telegram(
      "editMessageText",
      {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        text:
          "✅ Подписка подтверждена!\n\n" +
          "🎬 Доступ к видео открыт.",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🎬 Смотреть видео",
                url: VIDEO_URL
              }
            ]
          ]
        }
      },
      env
    );
  } else {
    await telegram(
      "answerCallbackQuery",
      {
        callback_query_id: callback.id,
        text: "❌ Ты ещё не подписан на канал.",
        show_alert: true
      },
      env
    );
  }
}
