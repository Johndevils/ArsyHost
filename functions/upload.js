export async function onRequest(context) {
    const { request, env } = context;
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle Preflight
    if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) return new Response(JSON.stringify({ error: "No file" }), { status: 400, headers: corsHeaders });

        // Forward to Telegram
        const tgForm = new FormData();
        tgForm.append('chat_id', env.TG_CHAT_ID);
        tgForm.append('document', file);

        const tgRes = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendDocument`, {
            method: 'POST',
            body: tgForm
        });

        const tgData = await tgRes.json();
        if (!tgData.ok) throw new Error(tgData.description);

        const fileId = tgData.result.document.file_id;
        const finalUrl = `${new URL(request.url).origin}/file/${fileId}`;

        return new Response(JSON.stringify({
            success: true,
            url: finalUrl,
            name: file.name
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
}
