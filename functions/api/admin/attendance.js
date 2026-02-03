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
            const date = url.searchParams.get("date");
            let query = supabase
                .from('attendance')
                .select('*, users(name)')
                .order('date', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(100);

            if (date) {
                query = query.eq('date', date);
            }

            const { data, error } = await query;
            if (error) throw error;

            const results = data.map(item => ({
                ...item,
                user_name: item.users ? item.users.name : 'Unknown'
            }));

            return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
        }

        if (method === "POST") {
            const { user_id, status, date } = await request.json();
            if (!user_id || !status || !date) return new Response(JSON.stringify({ error: "Data tidak lengkap" }), { status: 400 });

            const { error } = await supabase
                .from('attendance')
                .insert([{ user_id, status, date }]);

            if (error) {
                if (error.code === '23505') return new Response(JSON.stringify({ error: "User sudah memiliki data absensi pada tanggal tersebut" }), { status: 409 });
                throw error;
            }
            return new Response(JSON.stringify({ success: true }), { status: 201 });
        }

        if (method === "PUT") {
            const { id, status, date } = await request.json();
            if (!id || !status || !date) return new Response(JSON.stringify({ error: "Data tidak lengkap" }), { status: 400 });

            const { error } = await supabase
                .from('attendance')
                .update({ status, date })
                .eq('id', id);

            if (error) throw error;
            return new Response(JSON.stringify({ success: true }));
        }

        if (method === "DELETE") {
            const id = url.searchParams.get("id");
            if (!id) return new Response(JSON.stringify({ error: "ID wajib diisi" }), { status: 400 });

            const { error } = await supabase
                .from('attendance')
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
