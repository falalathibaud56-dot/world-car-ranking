const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
export default async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new Response(JSON.stringify({ races: [], configured: false }), { status: 200, headers });
  const response = await fetch(`${url}/rest/v1/wcr_races?select=external_id,name,date,category,first,second,third,first_driver,second_driver,third_driver,source,verified,updated_at&order=date.desc&limit=2000`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!response.ok) return new Response(JSON.stringify({ error: "Database read failed" }), { status: 502, headers });
  const rows = await response.json();
  return new Response(JSON.stringify({ races: rows.map(r => ({ ...r, id: r.external_id, origin: "official" })), configured: true }), { status: 200, headers });
};
