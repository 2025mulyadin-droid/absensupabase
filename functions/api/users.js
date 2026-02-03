import { createClient } from 'https://esm.sh/@supabase/supabase-js'

export async function onRequestGet(context) {
  const { env } = context;
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
