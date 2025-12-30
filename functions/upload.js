export async function onRequest(context) {
    const { request, env } = context;

    // 1. CORS Headers (Taaki doosri sites bhi use kar sakein)
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    // 2. Handle OPTIONS (Browser pre-check)
    if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    // 3. Only allow POST requests
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), { 
            status: 405, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
    }

    try {
        // 4. Validate Environment Variables
        if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) {
            console.error("Environment Variables Missing");
            return new Response(JSON.stringify({ 
                error: "Cloudflare Settings mein TG_BOT_TOKEN ya TG_CHAT_ID nahi mila. Dashboard mein Variables check karein aur Redeploy karein." 
            }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 5. Parse Multipart Form Data
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return new Response(JSON.stringify({ error: "No file uploaded" }), { 
                status: 400, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
        }

        // 6. Forward the file to Telegram Bot API
        const tgForm = new FormData();
        tgForm.append('chat_id', env.TG_CHAT_ID);
        tgForm.append('document', file);

        const tgRes = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendDocument`, {
            method: 'POST',
            body: tgForm
        });

        const tgData = await tgRes.json();

        // 7. Handle Telegram Response
        if (!tgData.ok) {
            console.error("Telegram API Error:", tgData.description);
            return new Response(JSON.stringify({ 
                error: `Telegram Error: ${tgData.description}. Check karein ki Bot aapke channel mein Admin hai ya nahi.` 
            }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 8. Generate Hosted URL
        const fileId = tgData.result.document.file_id;
        const url = new URL(request.url);
        const finalUrl = `${url.origin}/file/${fileId}`;

        // 9. Final Success Response
        return new Response(JSON.stringify({
            success: true,
            url: finalUrl,
            name: file.name
        }), {
            headers: { 
                ...corsHeaders,
                "Content-Type": "application/json" 
            }
        });

    } catch (err) {
        console.error("Worker Catch Error:", err.message);
        return new Response(JSON.stringify({ 
            error: "Internal Server Error: " + err.message 
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
}
