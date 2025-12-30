export async function onRequestGet(context) {
    const { params, env } = context;
    const fileId = params.id;

    // 1. Get File Path from Telegram
    const getFile = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/getFile?file_id=${fileId}`);
    const fileData = await getFile.json();

    if (!fileData.ok) return new Response("Not Found", { status: 404 });

    // 2. Stream actual image from Telegram servers
    const filePath = fileData.result.file_path;
    const imageRes = await fetch(`https://api.telegram.org/file/bot${env.TG_BOT_TOKEN}/${filePath}`);

    const response = new Response(imageRes.body, imageRes);
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Cache-Control", "public, max-age=31536000"); // 1 year cache
    
    return response;
}
