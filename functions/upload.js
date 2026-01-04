export async function onRequestPost({ request, env }) {

    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) {
        return new Response(
            JSON.stringify({ error: "Telegram env vars missing" }),
            { status: 500, headers: corsHeaders }
        );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
        return new Response(
            JSON.stringify({ error: "No file uploaded" }),
            { status: 400, headers: corsHeaders }
        );
    }

    // ✅ sendPhoto (NOT sendDocument)
    const tgForm = new FormData();
    tgForm.append("chat_id", env.TG_CHAT_ID);
    tgForm.append("photo", file);

    const tgRes = await fetch(
        `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendPhoto`,
        { method: "POST", body: tgForm }
    );

    const tgData = await tgRes.json();

    if (!tgData.ok) {
        return new Response(
            JSON.stringify({ error: tgData.description }),
            { status: 500, headers: corsHeaders }
        );
    }

    const fileId = tgData.result.photo.at(-1).file_id;
    const viewUrl = `${new URL(request.url).origin}/file/${fileId}`;

    return new Response(
        JSON.stringify({
            success: true,
            fileId,
            url: viewUrl
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}
