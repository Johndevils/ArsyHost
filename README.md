## 🚀 ArsyHost - Unlimited Image Hosting API

ArsyHost is a high-performance, open-source image hosting service that uses **Telegram** for unlimited storage and **Cloudflare Pages** for global delivery. It provides a clean web interface and a developer-friendly API.

## 🌟 Features

- **Unlimited Storage:** Leverages Telegram's cloud infrastructure.
- **Global CDN:** Images are served through Cloudflare’s edge network for maximum speed.
- **Developer Friendly:** Simple REST API with CORS enabled for cross-origin use.
- **Privacy Focused:** Your Telegram Bot Token and Chat ID are hidden on the server side.
- **Zero Maintenance:** No database or expensive object storage (S3/R2) required.
- **Beautiful UI:** Modern, responsive dashboard with Drag & Drop and API documentation.

---

## 📁 Project Structure

```text
├── public/
│   └── index.html       # Frontend (UI, API Docs, About)
├── functions/
│   ├── upload.js        # API: Handles image uploads to Telegram
│   └── file/
│       └── [id].js      # Proxy: Fetches and serves images from Telegram
├── wrangler.toml        # Cloudflare configuration
└── README.md            # Documentation
```

---

## 🛠️ Setup Instructions

### 1. Telegram Bot Setup
1. Message [@BotFather](https://t.me/botfather) on Telegram and create a new bot.
2. Copy the **API Token**.
3. Create a new Telegram **Channel** (Private or Public).
4. Add your bot to the channel as an **Admin**.
5. Get your **Chat ID** (Example: `-100123456789`). 
   * *Tip: Forward a message from the channel to [@userinfobot](https://t.me/userinfobot) to find the ID.*

### 2. Deployment
This project is designed to be hosted on **Cloudflare Pages**.

1. **Install Wrangler CLI:**
   ```bash
   npm install -g wrangler
   ```
2. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```
3. **Deploy the project:**
   ```bash
   npx wrangler pages deploy public
   ```

### 3. Environment Variables
Once deployed, you must add your Telegram credentials to the Cloudflare Dashboard:
1. Go to **Workers & Pages** > **Your Project** > **Settings** > **Functions**.
2. Scroll to **Environment Variables** and add:
   - `TG_BOT_TOKEN`: Your Telegram Bot API Token.
   - `TG_CHAT_ID`: Your Telegram Channel/Chat ID.
3. **Redeploy** the project for the changes to take effect.

---

## 📡 API Documentation

### Upload Image
**Endpoint:** `POST /upload`  
**Content-Type:** `multipart/form-data`

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `file` | `File` | The image file to upload (Max 20MB) |

#### Example (JavaScript)
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('https://your-domain.pages.dev/upload', {
    method: 'POST',
    body: formData
});
const data = await response.json();
console.log(data.url); // Returns the hosted link
```

#### Success Response
```json
{
  "success": true,
  "url": "https://your-domain.pages.dev/file/AgACAgUAAxkDA...",
  "name": "image.png"
}
```

---

## ⚠️ Limitations
- **File Size:** Telegram Bot API limits file uploads to **20MB**.
- **File Types:** While designed for images, it can store any file type supported by Telegram's `sendDocument`.

## 📜 License
This project is open-source and free to use.

---

### 🙌 Credits
- **Hosting:** [Cloudflare Pages](https://pages.cloudflare.com/)
- **Storage:** [Telegram Bot API](https://core.telegram.org/bots/api)
- **UI Design:** [Tailwind CSS](https://tailwindcss.com/)
