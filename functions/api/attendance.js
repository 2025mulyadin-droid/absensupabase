import { createClient } from 'https://esm.sh/@supabase/supabase-js'

export async function onRequestGet(context) {
    const { env, request } = context;
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const url = new URL(request.url);
    const dateStr = url.searchParams.get("date"); // YYYY-MM-DD

    if (!dateStr) {
        return new Response(JSON.stringify({ error: "Date parameter required" }), { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('attendance')
            .select('id, user_id, status, date, created_at, users(name)')
            .eq('date', dateStr)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Flatten users(name) to match previous structure
        const results = data.map(item => ({
            ...item,
            name: item.users ? item.users.name : 'Unknown'
        }));

        return new Response(JSON.stringify(results), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { env, request } = context;
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

    try {
        const body = await request.json();
        const { user_id, status, date } = body;

        if (!user_id || !status || !date) {
            return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
        }

        // Check for Weekend
        const d = new Date(date);
        const day = d.getUTCDay(); // 0=Sunday, 6=Saturday
        if (day === 0 || day === 6) {
            return new Response(JSON.stringify({ error: "Absensi ditutup pada hari libur (Sabtu/Minggu)." }), { status: 400 });
        }

        // Check for Custom Holidays
        const { data: holiday } = await supabase
            .from('holidays')
            .select('description')
            .eq('holiday_date', date)
            .maybeSingle();

        if (holiday) {
            return new Response(JSON.stringify({ error: `Hari ini libur: ${holiday.description || 'Tanpa keterangan'}` }), { status: 400 });
        }

        // Insert
        const { error } = await supabase
            .from('attendance')
            .insert([{ user_id, status, date }]);

        if (error) {
            if (error.code === '23505') { // Duplicate unique constraint
                return new Response(JSON.stringify({ error: "User sudah absen hari ini" }), { status: 409 });
            }
            throw error;
        }

        return new Response(JSON.stringify({ success: true }), { status: 201 });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
