export async function onRequestGet({ params, env }) {

    const fileId = params.id;
    if (!fileId) {
        return new Response("Missing file id", { status: 400 });
    }

    if (!env.TG_BOT_TOKEN) {
        return new Response("Bot token missing", { status: 500 });
    }

    // 1. Get file metadata
    const metaRes = await fetch(
        `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/getFile?file_id=${fileId}`
    );

    const meta = await metaRes.json();
    if (!meta.ok) {
        return new Response("File not found", { status: 404 });
    }

    const filePath = meta.result.file_path;

    // 2. Download actual file
    const fileRes = await fetch(
        `https://api.telegram.org/file/bot${env.TG_BOT_TOKEN}/${filePath}`
    );

    if (!fileRes.ok) {
        return new Response("Failed to fetch file", { status: 502 });
    }

    // 3. Detect MIME from extension
    const ext = filePath.split(".").pop().toLowerCase();
    const mimeMap = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp"
    };

    const contentType = mimeMap[ext] || "application/octet-stream";

    // 4. Stream to browser
    return new Response(fileRes.body, {
        headers: {
            "Content-Type": contentType,
            "Content-Disposition": "inline",
            "Cache-Control": "public, max-age=31536000, immutable",
            "Access-Control-Allow-Origin": "*"
        }
    });
}
