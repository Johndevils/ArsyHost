// worker.js - Arsynox Bot (URL Uploader + Hosting Links + Broadcast)

// ---------- Global State ---------- //
let BOT_TOKEN = "";
let BOT_SECRET = ""; 
let TELEGRAM_API = ""; 
let DB = null; 

// ---------- Configuration ---------- //
const BOT_OWNER = 6822491887; // Your Admin ID
const WELCOME_IMAGE_URL = "https://arsynoxhash.dpdns.org/file/BQACAgUAAyEGAAS6vrhKAANeaVLD8wLMLaq-7RwB8mjiwr8JNqQAAv8bAAKPgphW99DIqmGKCuk2BA.jpg";

// Hosting Links
const LINK_HASH = "https://arsynoxhash.dpdns.org";
const LINK_IMG_HOST = "https://telegram-image-hosting.pages.dev/";

// ---------- Main Entry Point ---------- //
export default {
    async fetch(request, env, ctx) {
        // 1. Load Secrets
        BOT_TOKEN = env.BOT_TOKEN;
        BOT_SECRET = env.BOT_SECRET; // Optional
        DB = env.BOT_USERS; // KV Database

        // 2. Safety Check
        if (!BOT_TOKEN) return new Response("Error: BOT_TOKEN is missing in Settings.", { status: 500 });
        
        TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

        // 3. Handle Routes
        const url = new URL(request.url);
        
        if (url.pathname === "/webhook") return handleWebhook(request, ctx);
        if (url.pathname === "/setwebhook") return registerWebhook(url.origin);
        
        return new Response("Arsynox Bot is Running. Status: OK");
    }
};

// ---------- Webhook Handler ---------- //
async function handleWebhook(request, ctx) {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    
    try {
        const update = await request.json();
        ctx.waitUntil(processUpdate(update)); // Run in background
        return new Response("OK");
    } catch (e) {
        return new Response("Error", { status: 500 });
    }
}

// ---------- Update Processor ---------- //
async function processUpdate(update) {
    if (update.callback_query) {
        await handleCallback(update.callback_query);
        return;
    }

    if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id;
        const text = msg.text || "";

        // 1. Save User to DB (For Broadcast)
        if (DB) DB.put(`user:${chatId}`, new Date().toISOString()).catch(()=>{});

        // 2. Handle Commands
        if (text.startsWith("/")) {
            if (text.startsWith("/start")) return sendWelcome(chatId);
            if (text.startsWith("/help")) return sendHelp(chatId);
            if (text.startsWith("/speedtest")) return sendSpeedTest(chatId);
            if (text.startsWith("/broadcast")) return handleBroadcast(chatId, text);
        }

        // 3. URL Uploader Logic
        if (text.startsWith("http")) {
            await handleUrlUpload(chatId, text);
            return;
        }

        // 4. Default
        // If it's a file, we ignore it for now as you asked to remove complex logic
        // If it's just text, send welcome
        if (!text.startsWith("/")) await sendWelcome(chatId);
    }
}

// ---------- Feature: URL Uploader ---------- //
async function handleUrlUpload(chatId, url) {
    const statusMsg = await sendMessage(chatId, "⏳ *Processing URL...*\nAttemping to upload to Telegram...", { parse_mode: 'Markdown' });
    
    try {
        // Method: We tell Telegram to fetch the URL directly.
        // This is fast and doesn't use Worker bandwidth.
        const res = await fetch(`${TELEGRAM_API}/sendDocument`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                document: url,
                caption: `🔗 *Uploaded via URL*\n\n📂 Source: [Link](${url})`,
                parse_mode: "Markdown"
            })
        });

        const result = await res.json();

        if (result.ok) {
            await editMessage(chatId, statusMsg.result.message_id, "✅ *Upload Complete!*");
        } else {
            await editMessage(chatId, statusMsg.result.message_id, `❌ *Upload Failed*\nTelegram could not fetch this URL.\nError: \`${result.description}\``, {parse_mode: 'Markdown'});
        }

    } catch (e) {
        await editMessage(chatId, statusMsg.result.message_id, "❌ *System Error during upload.*");
    }
}

// ---------- Feature: Broadcast ---------- //
async function handleBroadcast(chatId, text) {
    if (chatId != BOT_OWNER) return sendMessage(chatId, "⛔️ Admin Only.");
    
    const message = text.replace("/broadcast", "").trim();
    if (!message) return sendMessage(chatId, "⚠️ Usage: `/broadcast Your Message`", {parse_mode: 'Markdown'});
    
    if (!DB) return sendMessage(chatId, "❌ Database not connected.");

    await sendMessage(chatId, "📣 *Starting Broadcast...*", {parse_mode: 'Markdown'});
    
    const list = await DB.list({ prefix: "user:" });
    let sent = 0;

    for (const key of list.keys) {
        const userId = key.name.split(":")[1];
        // Tiny delay to prevent spam limits
        await new Promise(r => setTimeout(r, 50));
        const res = await sendMessage(userId, `📢 *Announcement*\n\n${message}`, {parse_mode: 'Markdown'});
        if (res.ok) sent++;
        else if (res.error_code === 403) await DB.delete(key.name); // Delete blocked users
    }

    await sendMessage(chatId, `✅ *Broadcast Done*\nSent to: ${sent} users.`);
}

// ---------- Feature: Speed Test ---------- //
async function sendSpeedTest(chatId) {
    const start = Date.now();
    const msg = await sendMessage(chatId, "🚀 Testing Speed...");
    await fetch(`${TELEGRAM_API}/getMe`); // Ping Telegram
    const ping = Date.now() - start;
    
    await editMessage(chatId, msg.result.message_id, `📊 *Speed Test Result*\n\nLatency: ${ping}ms\nServer: Cloudflare Workers`, {parse_mode: 'Markdown'});
}

// ---------- UI: Welcome Message ---------- //
async function sendWelcome(chatId) {
    const text = `🌟 *About Arsynox File Upload & Hosting Bot* 🌟

*Your all-in-one solution for file management!*

📤 *Upload to Telegram:*
Send any direct URL (http/https) to upload it as a file.

🌐 *Arsynox Hosting:*
Check out our hosting services below.

*Version 3.0 | Powered by Cloudflare Workers*`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: "🏠 Arsynox Hash", url: LINK_HASH },
                { text: "🖼 Image Hosting", url: LINK_IMG_HOST }
            ],
            [
                { text: "📊 Speed Test", callback_data: "speedtest" },
                { text: "📖 Help", callback_data: "help" }
            ],
            [
                { text: "🔄 Refresh", callback_data: "start" }
            ]
        ]
    };

    // Try sending photo
    try {
        const res = await fetch(`${TELEGRAM_API}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                photo: WELCOME_IMAGE_URL,
                caption: text,
                parse_mode: "Markdown",
                reply_markup: keyboard
            })
        });
        // If photo fails (invalid URL), send text fallback
        if (!res.ok) throw new Error();
    } catch (e) {
        await sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: JSON.stringify(keyboard) });
    }
}

function sendHelp(chatId) {
    return sendMessage(chatId, 
        `📖 *Help Menu*\n\n` +
        `1. *URL Upload:* Just send any link (e.g., https://site.com/video.mp4)\n` +
        `2. *Speed Test:* /speedtest\n` +
        `3. *Broadcast:* /broadcast (Admin Only)`,
        { parse_mode: 'Markdown' }
    );
}

// ---------- Callback Handler ---------- //
async function handleCallback(cb) {
    const chatId = cb.message.chat.id;
    const data = cb.data;

    // Answer callback to stop loading animation
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ callback_query_id: cb.id })
    });

    if (data === "speedtest") return sendSpeedTest(chatId);
    if (data === "help") return sendHelp(chatId);
    if (data === "start") return sendWelcome(chatId);
}

// ---------- Telegram Helpers ---------- //
async function sendMessage(chatId, text, extra = {}) {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, ...extra })
    });
    return await res.json();
}

async function editMessage(chatId, msgId, text, extra = {}) {
    await fetch(`${TELEGRAM_API}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: msgId, text, ...extra })
    });
}

// ---------- Helper: Set Webhook ---------- //
async function registerWebhook(origin) {
    const url = `${TELEGRAM_API}/setWebhook?url=${origin}/webhook`;
    const res = await fetch(url);
    return new Response(JSON.stringify(await res.json(), null, 2), { headers: { "Content-Type": "application/json" } });
}
