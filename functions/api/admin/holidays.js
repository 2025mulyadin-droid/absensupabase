import { createClient } from '@supabase/supabase-js'

export async function onRequest(context) {
    const { env, request } = context;
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const url = new URL(request.url);
    const method = request.method;

    const authHeader = request.headers.get("Authorization");
    if (authHeader !== "Bearer bismillah-token-123") {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        if (method === "GET") {
            const { data, error } = await supabase
                .from('holidays')
                .select('*')
                .order('holiday_date', { ascending: false });
            if (error) throw error;
            return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
        }

        if (method === "POST") {
            const { holiday_date, description } = await request.json();
            if (!holiday_date) return new Response(JSON.stringify({ error: "Tanggal wajib diisi" }), { status: 400 });

            const { error } = await supabase
                .from('holidays')
                .insert([{ holiday_date, description: description || "" }]);

            if (error) throw error;
            return new Response(JSON.stringify({ success: true }), { status: 201 });
        }

        if (method === "PUT") {
            const { id, holiday_date, description } = await request.json();
            if (!id || !holiday_date) return new Response(JSON.stringify({ error: "ID dan Tanggal wajib diisi" }), { status: 400 });

            const { error } = await supabase
                .from('holidays')
                .update({ holiday_date, description })
                .eq('id', id);

            if (error) throw error;
            return new Response(JSON.stringify({ success: true }));
        }

        if (method === "DELETE") {
            const id = url.searchParams.get("id");
            if (!id) return new Response(JSON.stringify({ error: "ID wajib diisi" }), { status: 400 });

            const { error } = await supabase
                .from('holidays')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return new Response(JSON.stringify({ success: true }));
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
