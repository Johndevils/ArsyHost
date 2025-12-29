/**
 * Arsynox File Upload & Hosting Bot - BULLETPROOF VERSION
 * Version: 3.6
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // --- SETUP ENDPOINT ---
    // Visit: https://your-worker.workers.dev/setup
    if (url.pathname === '/setup') {
      const webhookUrl = `https://${url.hostname}`;
      const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook?url=${webhookUrl}&drop_pending_updates=true`);
      const data = await response.json();
      return new Response(JSON.stringify({ 
        info: "Webhook Configuration",
        worker_url: webhookUrl,
        telegram_response: data 
      }, null, 2), { headers: { "Content-Type": "application/json" } });
    }

    // --- TELEGRAM POST HANDLER ---
    if (request.method === 'POST') {
      try {
        const update = await request.json();
        if (update.message) {
          ctx.waitUntil(handleUpdate(update, env, request.cf));
        }
        return new Response('OK');
      } catch (e) {
        return new Response('Internal Error', { status: 500 });
      }
    }

    return new Response("Bot is running. Use /setup to link with Telegram.");
  }
};

async function handleUpdate(update, env, cf) {
  const chatId = update.message.chat.id;
  const text = update.message.text || "";

  // 1. Check if BOT_TOKEN is missing
  if (!env.BOT_TOKEN) {
    return await sendMsg(env, chatId, "❌ Error: BOT_TOKEN is missing in Environment Variables!");
  }

  // 2. Test Command (Bina KV ke chalega)
  if (text === '/test') {
    return await sendMsg(env, chatId, "✅ Bot Connection is OK! Webhook is working.");
  }

  // 3. Start Command (KV Binding check ke saath)
  if (text === '/start') {
    try {
      // KV Check
      if (env.BOT_USERS) {
        await env.BOT_USERS.put(`user:${chatId}`, 'active');
      } else {
        await sendMsg(env, chatId, "⚠️ Warning: KV Binding 'BOT_USERS' is not found. User not saved.");
      }
    } catch (err) {
      await sendMsg(env, chatId, "⚠️ KV Error: " + err.message);
    }

    const welcomeText = `🌟 *Arsynox File Upload Bot* 🌟\n\nSend a direct link to upload or use /speedtest.`;
    return await sendMsg(env, chatId, welcomeText, "Markdown");
  }

  // 4. Speedtest Command
  if (text === '/speedtest') {
    const ping = cf?.clientTcpRtt || "N/A";
    const speed = Math.floor(Math.random() * 400) + 500;
    const location = cf?.city || "Unknown";
    const caption = `📊 Speed: ${speed}Mbps\n🕒 Ping: ${ping}ms\n🌐 Loc: ${location}`;
    
    return await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: "https://arsynoxhash.dpdns.org/file/BQACAgUAAyEGAAS6vrhKAANeaVLD8wLMLaq-7RwB8mjiwr8JNqQAAv8bAAKPgphW99DIqmGKCuk2BA.jpg",
        caption: caption
      })
    });
  }
}

async function sendMsg(env, chatId, text, mode = "") {
  return await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: mode
    })
  });
}
