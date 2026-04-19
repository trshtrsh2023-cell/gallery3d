export default async function handler(req, res) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(200).json(req.method==='GET'?[]:{ok:true});
  try {
    const {createClient} = await import('@supabase/supabase-js');
    const sb = createClient(url, key);
    if (req.method==='POST') {
      const {visitor_id,name,x,z,yaw}=req.body||{};
      if(!visitor_id||!name) return res.status(400).json({error:'Missing'});
      await sb.from('visitors').upsert({visitor_id,name,x:+x||0,z:+z||21,yaw:+yaw||0,last_seen:new Date().toISOString()},{onConflict:'visitor_id'});
      return res.status(200).json({ok:true});
    }
    if (req.method==='GET') {
      const since=new Date(Date.now()-10000).toISOString();
      const {data}=await sb.from('visitors').select('visitor_id,name,x,z,yaw').gte('last_seen',since);
      return res.status(200).json(data||[]);
    }
    if (req.method==='DELETE') {
      const {visitor_id}=req.body||{};
      if(visitor_id) await sb.from('visitors').delete().eq('visitor_id',visitor_id);
      return res.status(200).json({ok:true});
    }
    return res.status(405).end();
  } catch(e) { return res.status(200).json(req.method==='GET'?[]:{ok:true}); }
}
