export async function onRequestPost(context) {
    const { request } = context;
    try {
        const { password } = await request.json();
        if (password === "bismillah") {
            return new Response(JSON.stringify({ success: true, token: "bismillah-token-123" }), {
                headers: { "Content-Type": "application/json" },
            });
        }
        return new Response(JSON.stringify({ error: "Password salah" }), { status: 401 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
