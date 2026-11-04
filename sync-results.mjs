/* WCR scheduled importer: F1 feed via Jolpica + optional licensed provider adapter. */
const allowed = new Set(["Ferrari","Porsche","Mercedes","BMW","Audi","Toyota","Ford","McLaren","Lamborghini","Aston Martin","Chevrolet","Nissan","Honda","Alpine","Peugeot","Renault","Cadillac","Lexus","Volkswagen","Bugatti"]);
const constructorMap = { ferrari:"Ferrari", mercedes:"Mercedes", mclaren:"McLaren", alpine:"Alpine", aston_martin:"Aston Martin", cadillac:"Cadillac", audi:"Audi" };
const mapMake = r => constructorMap[r?.Constructor?.constructorId] || null;
async function getF1Events() {
  const root = "https://api.jolpi.ca/ergast/f1/current";
  const [rr, sr] = await Promise.all([fetch(`${root}/results.json?limit=1000`), fetch(`${root}/sprint.json?limit=1000`)]);
  if (!rr.ok || !sr.ok) throw new Error(`Jolpica API error ${rr.status}/${sr.status}`);
  const [rj, sj] = await Promise.all([rr.json(), sr.json()]);
  const out=[];
  const collect=(races,kind)=>{
    for (const race of races || []) {
      const results = kind === "sprint" ? (race.SprintResults || []) : (race.Results || []);
      const ordered=[...results].sort((a,b)=>Number(a.position)-Number(b.position));
      if (ordered.length < 3) continue;
      const driverPodium=ordered.slice(0,3);
      const uniqueMakes=[];
      for (const item of ordered) { const make=mapMake(item); if (make && allowed.has(make) && !uniqueMakes.includes(make)) uniqueMakes.push(make); if (uniqueMakes.length===3) break; }
      if (uniqueMakes.length < 3) continue;
      out.push({
        external_id:`jolpica-f1-${race.season}-${race.round}-${kind}`,
        name:`${race.raceName}${kind === "sprint" ? " — Sprint" : ""}`,
        date:race.date, category:"Formula 1", session_type:"race", status:"final",
        first:uniqueMakes[0], second:uniqueMakes[1], third:uniqueMakes[2],
        first_driver:`${driverPodium[0].Driver.givenName} ${driverPodium[0].Driver.familyName}`,
        second_driver:`${driverPodium[1].Driver.givenName} ${driverPodium[1].Driver.familyName}`,
        third_driver:`${driverPodium[2].Driver.givenName} ${driverPodium[2].Driver.familyName}`,
        source_url:"https://www.formula1.com/en/results.html",
        updated_at:new Date().toISOString()
      });
    }
  };
  collect(rj?.MRData?.RaceTable?.Races,"race");
  collect(sj?.MRData?.RaceTable?.Races,"sprint");
  return out;
}
async function getOtherProviderEvents() {
  const endpoint=process.env.WCR_RESULTS_API_URL;
  if (!endpoint) return [];
  const token=process.env.WCR_RESULTS_API_TOKEN;
  const response=await fetch(endpoint,{headers:{Accept:"application/json",...(token?{Authorization:`Bearer ${token}`}:{})}});
  if (!response.ok) throw new Error(`External provider HTTP ${response.status}`);
  const payload=await response.json(); return Array.isArray(payload.events)?payload.events:[];
}
function validate(events) {
  return events.filter(e=>e.status==="final" && e.session_type==="race" && e.external_id && e.name && e.date && e.category && e.source_url && [e.first,e.second,e.third].every(x=>allowed.has(x)) && new Set([e.first,e.second,e.third]).size===3).map(e=>({
    external_id:String(e.external_id), name:String(e.name), date:String(e.date).slice(0,10), category:String(e.category),
    first:e.first, second:e.second, third:e.third,
    first_driver:e.first_driver||null, second_driver:e.second_driver||null, third_driver:e.third_driver||null,
    source:String(e.source_url), verified:true, provider_updated_at:e.updated_at||null
  }));
}
export default async () => {
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.log("WCR sync skipped: Supabase environment variables missing"); return new Response("Database not configured"); }
  const [f1,extra]=await Promise.all([getF1Events(),getOtherProviderEvents()]);
  const rows=validate([...f1,...extra]);
  if (!rows.length) return new Response("No eligible final podiums");
  const response=await fetch(`${url}/rest/v1/wcr_races?on_conflict=external_id`,{method:"POST",headers:{"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal",apikey:key,Authorization:`Bearer ${key}`},body:JSON.stringify(rows)});
  if (!response.ok) throw new Error(`Supabase upsert ${response.status}: ${await response.text()}`);
  console.log(`WCR synced ${rows.length} podiums; F1 candidates ${f1.length}`);
  return new Response(`Synced ${rows.length} podiums`);
};
export const config={schedule:"*/15 * * * *"};
