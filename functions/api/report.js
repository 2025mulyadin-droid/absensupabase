import { createClient } from 'https://esm.sh/@supabase/supabase-js'

export async function onRequestGet(context) {
    const { env, request } = context;
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const url = new URL(request.url);
    const startDate = url.searchParams.get("start");
    const endDate = url.searchParams.get("end");

    if (!startDate || !endDate) {
        return new Response(JSON.stringify({ error: "Start and End date required" }), { status: 400 });
    }

    try {
        // 1. Get detailed list
        const { data: listData, error: listError } = await supabase
            .from('attendance')
            .select(`
                date,
                status,
                users (name)
            `)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

        if (listError) throw listError;
        const list = listData.map(item => ({
            date: item.date,
            status: item.status,
            name: item.users.name
        }));

        // 2. Get summary per user
        // Note: PostgREST doesn't support complex GROUP BY with multiple counts easily in a single request 
        // without a custom function (RPC). To keep it simple, we'll fetch all attendance in range and aggregate in JS,
        // OR fetch users and their attendance count.

        // Fetch all users
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, name')
            .order('name', { ascending: true });

        if (usersError) throw usersError;

        // Fetch all attendance in range
        const { data: allAttn, error: attnError } = await supabase
            .from('attendance')
            .select('user_id, status')
            .gte('date', startDate)
            .lte('date', endDate);

        if (attnError) throw attnError;

        const summary = users.map(u => {
            const userAttn = allAttn.filter(a => a.user_id === u.id);
            return {
                name: u.name,
                total_hadir: userAttn.filter(a => a.status === 'Hadir').length,
                total_sakit: userAttn.filter(a => a.status === 'Sakit').length,
                total_izin: userAttn.filter(a => a.status === 'Izin').length,
                total_absen: userAttn.length
            };
        });

        // 3. Get holidays
        const { data: holidays, error: holidayError } = await supabase
            .from('holidays')
            .select('holiday_date, description')
            .gte('holiday_date', startDate)
            .lte('holiday_date', endDate);

        if (holidayError) throw holidayError;

        return new Response(JSON.stringify({ list, summary, holidays }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
