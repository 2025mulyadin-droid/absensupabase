import { createClient } from 'https://esm.sh/@supabase/supabase-js'

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
                .from('users')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
        }

        if (method === "POST") {
            const { name, role } = await request.json();
            if (!name) return new Response(JSON.stringify({ error: "Nama wajib diisi" }), { status: 400 });
            const { error } = await supabase
                .from('users')
                .insert([{ name, role: role || "Guru/Karyawan" }]);
            if (error) throw error;
            return new Response(JSON.stringify({ success: true }), { status: 201 });
        }

        if (method === "PUT") {
            const { id, name, role } = await request.json();
            if (!id || !name) return new Response(JSON.stringify({ error: "ID dan Nama wajib diisi" }), { status: 400 });
            const { error } = await supabase
                .from('users')
                .update({ name, role })
                .eq('id', id);
            if (error) throw error;
            return new Response(JSON.stringify({ success: true }));
        }

        if (method === "DELETE") {
            const id = url.searchParams.get("id");
            if (!id) return new Response(JSON.stringify({ error: "ID wajib diisi" }), { status: 400 });
            const { error } = await supabase
                .from('users')
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
