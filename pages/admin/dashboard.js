import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const SLOT_COUNT=23;
const AC=['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6','#e11d48','#7c3aed','#0284c7','#d97706','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#84cc16','#f97316'];

export default function Dashboard(){
  const router=useRouter();
  const [photos,setPhotos]=useState([]);
  const [loading,setLoading]=useState(true);
  const [uploading,setUploading]=useState(false);
  const [form,setForm]=useState({title:'',subtitle:'',position_index:0});
  const [preview,setPreview]=useState(null);
  const [file,setFile]=useState(null);
  const [msg,setMsg]=useState(null);
  const [tab,setTab]=useState('upload');
  const [dragOver,setDragOver]=useState(false);
  const [reorderList,setReorderList]=useState([]);
  const [reorderSaving,setReorderSaving]=useState(false);
  const [dragging,setDragging]=useState(null);
  const [dragTarget,setDragTarget]=useState(null);
  const [visitData,setVisitData]=useState({count:0,recent:[]});
  const fileRef=useRef();

  const fetchPhotos=async()=>{
    setLoading(true);
    const res=await fetch('/api/photos');const data=await res.json();
    const list=Array.isArray(data)?data:[];
    setPhotos(list);setReorderList([...list].sort((a,b)=>a.position_index-b.position_index));
    setLoading(false);
  };
  const fetchVisits=async()=>{
    const res=await fetch('/api/visits').catch(()=>null);
    if(res?.ok){const d=await res.json();setVisitData(d);}
  };
  useEffect(()=>{fetchPhotos();fetchVisits();},[]);

  const showMsg=(text,type='success')=>{setMsg({text,type});setTimeout(()=>setMsg(null),3500);};
  const handleFile=(f)=>{if(!f||!f.type.startsWith('image/'))return;setFile(f);const r=new FileReader();r.onload=e=>setPreview(e.target.result);r.readAsDataURL(f);};

  const handleUpload=async()=>{
    if(!file||!form.title.trim()){showMsg('يرجى اختيار صورة وإدخال العنوان','error');return;}
    setUploading(true);const fd=new FormData();
    fd.append('image',file);fd.append('title',form.title);fd.append('subtitle',form.subtitle);fd.append('position_index',form.position_index);
    const res=await fetch('/api/photos/upload',{method:'POST',body:fd});const data=await res.json();
    setUploading(false);
    if(res.ok){showMsg('✓ تمت إضافة الصورة بنجاح');setForm({title:'',subtitle:'',position_index:photos.length});setFile(null);setPreview(null);fetchPhotos();}
    else showMsg(data.error||'خطأ في الرفع','error');
  };

  const handleDelete=async(id)=>{
    if(!confirm('هل أنت متأكد من حذف هذه الصورة؟'))return;
    const res=await fetch(`/api/photos/${id}`,{method:'DELETE'});
    if(res.ok){showMsg('تم حذف الصورة');fetchPhotos();}else showMsg('خطأ في الحذف','error');
  };

  const onDragStart=(i)=>setDragging(i);
  const onDragOver=(i)=>(e)=>{e.preventDefault();setDragTarget(i);};
  const onDrop=(i)=>{
    if(dragging===null||dragging===i)return;
    const nl=[...reorderList];const[moved]=nl.splice(dragging,1);nl.splice(i,0,moved);
    setReorderList(nl);setDragging(null);setDragTarget(null);
  };
  const moveItem=(i,dir)=>{const nl=[...reorderList];const j=i+dir;if(j<0||j>=nl.length)return;[nl[i],nl[j]]=[nl[j],nl[i]];setReorderList(nl);};

  const saveReorder=async()=>{
    setReorderSaving(true);
    const updates=reorderList.map((p,i)=>({id:p.id,position_index:i}));
    const res=await fetch('/api/photos/reorder',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({updates})});
    setReorderSaving(false);
    if(res.ok){showMsg('✓ تم حفظ الترتيب');fetchPhotos();}else showMsg('خطأ في الحفظ','error');
  };

  const logout=async()=>{await fetch('/api/admin/logout',{method:'POST'});router.push('/admin/login');};
  const usedSlots=new Set(photos.map(p=>p.position_index));
  const S={
    card:{background:'#fff',borderRadius:14,boxShadow:'0 2px 16px rgba(0,0,0,.06)',padding:'24px 26px'},
    input:{width:'100%',padding:'10px 14px',border:'1.5px solid #e0d8d0',borderRadius:8,fontSize:'.9rem',color:'#1a1510',background:'#faf8f5',outline:'none',fontFamily:'inherit'},
    btn:(bg,fg='#fff')=>({background:bg,color:fg,border:'none',padding:'11px 22px',borderRadius:8,cursor:'pointer',fontSize:'.86rem',fontFamily:'inherit',transition:'opacity .2s'}),
    tab:(a)=>({padding:'10px 22px',cursor:'pointer',fontFamily:'inherit',fontSize:'.84rem',border:'none',borderBottom:a?'2px solid #c8a820':'2px solid transparent',background:'transparent',color:a?'#1a1510':'#9a9080',transition:'all .2s'}),
  };

  return(
    <>
      <Head><title>لوحة التحكم · Gallery — AnwarBMA</title></Head>
      <div style={{minHeight:'100vh',background:'#f5f2ee',fontFamily:'Segoe UI,Tahoma,sans-serif'}}>

        {/* HEADER */}
        <div style={{background:'#1a1510',color:'#f0ece4',padding:'0 28px',height:58,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{display:'flex',gap:6}}>{['#c8a820','#ef4444','#3b82f6'].map(c=><div key={c} style={{width:8,height:8,borderRadius:'50%',background:c}}/>)}</div>
            <span style={{letterSpacing:'.22em',fontSize:'.85rem'}}>GALLERY · لوحة التحكم — AnwarBMA</span>
          </div>
          <div style={{display:'flex',gap:14,alignItems:'center'}}>
            <a href="/" target="_blank" style={{color:'#9a9080',fontSize:'.76rem',letterSpacing:'.1em',textDecoration:'none',borderBottom:'1px solid #4a4030',paddingBottom:1}}>عرض المعرض ↗</a>
            <button onClick={logout} style={{background:'transparent',border:'1px solid #3a3020',color:'#9a9080',padding:'5px 14px',cursor:'pointer',fontSize:'.74rem',borderRadius:4,fontFamily:'inherit'}}>خروج</button>
          </div>
        </div>

        {/* NOTIFICATION */}
        {msg&&(<div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',background:msg.type==='error'?'#fff5f5':'#f0fdf4',border:`1px solid ${msg.type==='error'?'#fecaca':'#bbf7d0'}`,color:msg.type==='error'?'#dc2626':'#16a34a',padding:'11px 28px',borderRadius:8,zIndex:999,fontSize:'.88rem',boxShadow:'0 4px 20px rgba(0,0,0,.1)'}}>{msg.text}</div>)}

        <div style={{maxWidth:1160,margin:'0 auto',padding:'30px 20px'}}>

          {/* STATS */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:14,marginBottom:28}}>
            {[
              {l:'إجمالي الزيارات',v:visitData.count.toLocaleString('ar-SA'),c:'#c8a820'},
              {l:'الصور المعروضة',v:photos.length,c:'#3b82f6'},
              {l:'مواقع متاحة',v:SLOT_COUNT-usedSlots.size,c:'#10b981'},
              {l:'إجمالي المواقع',v:SLOT_COUNT,c:'#8b5cf6'},
            ].map(({l,v,c})=>(
              <div key={l} style={{...S.card,borderTop:`3px solid ${c}`,padding:'16px 20px'}}>
                <div style={{fontSize:'.72rem',color:'#9a9080',marginBottom:6}}>{l}</div>
                <div style={{fontSize:'1.8rem',color:'#1a1510',fontWeight:300}}>{v}</div>
              </div>
            ))}
          </div>

          {/* TABS */}
          <div style={{borderBottom:'1px solid #e0d8d0',marginBottom:24,display:'flex',gap:0}}>
            {[['upload','رفع صورة'],['manage','إدارة الصور'],['reorder','ترتيب المواقع ↕'],['visitors','سجل الزوار 👁']].map(([id,label])=>(
              <button key={id} style={S.tab(tab===id)} onClick={()=>{setTab(id);if(id==='visitors')fetchVisits();}}>{label}</button>
            ))}
          </div>

          {/* ── UPLOAD ── */}
          {tab==='upload'&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
              <div style={S.card}>
                <h2 style={{fontSize:'1rem',fontWeight:500,color:'#1a1510',marginBottom:20}}>رفع صورة جديدة</h2>
                <div
                  onClick={()=>fileRef.current.click()}
                  onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}}
                  onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                  onDragLeave={()=>setDragOver(false)}
                  style={{border:`2px dashed ${dragOver?'#c8a820':'#e0d8d0'}`,borderRadius:12,padding:preview?8:'36px 20px',textAlign:'center',cursor:'pointer',marginBottom:18,minHeight:preview?'auto':150,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:dragOver?'rgba(200,168,32,.04)':'transparent'}}>
                  {preview?<img src={preview} alt="preview" style={{maxWidth:'100%',maxHeight:200,borderRadius:8}}/>
                  :<div><div style={{fontSize:'2.2rem',marginBottom:8}}>🖼️</div><div style={{color:'#9a9080',fontSize:'.82rem'}}>اضغط أو اسحب صورة</div><div style={{color:'#c0b8b0',fontSize:'.72rem',marginTop:3}}>PNG, JPG, WEBP, GIF — حتى 10MB</div></div>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
                {[{l:'عنوان الصورة *',k:'title',p:'مثال: غروب المدينة'},{l:'وصف / تصنيف',k:'subtitle',p:'مثال: تصوير حضري · 2024'}].map(({l,k,p})=>(
                  <div key={k} style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:'.76rem',color:'#6a6050',marginBottom:5}}>{l}</label>
                    <input style={S.input} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={p}
                      onFocus={e=>e.target.style.borderColor='#c8a820'} onBlur={e=>e.target.style.borderColor='#e0d8d0'}/>
                  </div>
                ))}
                <div style={{marginBottom:18}}>
                  <label style={{display:'block',fontSize:'.76rem',color:'#6a6050',marginBottom:5}}>موقع العرض في المعرض</label>
                  <select style={S.input} value={form.position_index} onChange={e=>setForm(p=>({...p,position_index:parseInt(e.target.value)}))}>
                    {Array.from({length:SLOT_COUNT},(_,i)=>(
                      <option key={i} value={i}>{`موقع #${i}${usedSlots.has(i)?' (مشغول)':' (متاح)'}`}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handleUpload} disabled={uploading||!file}
                  style={{...S.btn(uploading||!file?'#e0d8d0':'#1a1510'),width:'100%',opacity:uploading||!file?.6:1}}>
                  {uploading?'جاري الرفع...':'رفع الصورة →'}
                </button>
              </div>
              {/* Slot map */}
              <div style={S.card}>
                <h2 style={{fontSize:'1rem',fontWeight:500,color:'#1a1510',marginBottom:16}}>خريطة مواقع المعرض (23 موقع)</h2>
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8}}>
                  {Array.from({length:SLOT_COUNT},(_,i)=>{
                    const p=photos.find(ph=>ph.position_index===i);
                    return(<div key={i} title={p?p.title:`موقع #${i}`}
                      style={{borderRadius:8,border:`1.5px solid ${p?AC[i]:'#e0d8d0'}`,background:p?AC[i]+'18':'#faf8f5',padding:'8px 4px',textAlign:'center',cursor:'pointer'}}
                      onClick={()=>p&&setTab('manage')}>
                      <div style={{fontSize:'.66rem',fontWeight:600,color:p?AC[i]:'#c0b8b0'}}>{i}</div>
                      {p&&<div style={{fontSize:'.56rem',color:'#6a6050',marginTop:2,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',padding:'0 2px'}}>{p.title}</div>}
                    </div>);
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── MANAGE ── */}
          {tab==='manage'&&(
            <div style={S.card}>
              <h2 style={{fontSize:'1rem',fontWeight:500,color:'#1a1510',marginBottom:20}}>الصور المعروضة ({photos.length})</h2>
              {loading?<div style={{textAlign:'center',color:'#9a9080',padding:40}}>جاري التحميل...</div>
              :photos.length===0?<div style={{textAlign:'center',color:'#c0b8b0',padding:48,border:'2px dashed #e0d8d0',borderRadius:12}}><div style={{fontSize:'2.5rem',marginBottom:10}}>🖼️</div><div>لا توجد صور بعد</div></div>
              :<div style={{display:'grid',gap:12}}>{[...photos].sort((a,b)=>a.position_index-b.position_index).map((p)=>(
                <div key={p.id} style={{display:'flex',gap:14,alignItems:'center',background:'#faf8f5',borderRadius:10,padding:'12px 16px',border:'1px solid #e8e0d8',borderRight:`4px solid ${AC[p.position_index%AC.length]}`}}>
                  <div style={{position:'relative',flexShrink:0}}>
                    <img src={p.image_url} alt={p.title} style={{width:72,height:56,objectFit:'cover',borderRadius:6}}/>
                    <div style={{position:'absolute',top:-6,right:-6,background:AC[p.position_index%AC.length],color:'#fff',borderRadius:'50%',width:20,height:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.6rem',fontWeight:700}}>{p.position_index}</div>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:500,color:'#1a1510',fontSize:'.9rem',marginBottom:3}}>{p.title}</div>
                    <div style={{color:'#9a9080',fontSize:'.74rem'}}>{p.subtitle||'—'} · موقع #{p.position_index}</div>
                    <div style={{color:'#b0a898',fontSize:'.68rem',marginTop:2}}>{new Date(p.created_at).toLocaleDateString('ar-SA')}</div>
                  </div>
                  <div style={{display:'flex',gap:8,flexShrink:0}}>
                    <a href={p.image_url} target="_blank" style={{background:'#eff6ff',border:'1px solid #bfdbfe',color:'#2563eb',padding:'5px 12px',borderRadius:6,fontSize:'.74rem',textDecoration:'none'}}>عرض</a>
                    <button onClick={()=>handleDelete(p.id)} style={{background:'#fff5f5',border:'1px solid #fecaca',color:'#ef4444',padding:'5px 12px',cursor:'pointer',borderRadius:6,fontSize:'.74rem',fontFamily:'inherit'}}>حذف</button>
                  </div>
                </div>
              ))}</div>}
            </div>
          )}

          {/* ── REORDER ── */}
          {tab==='reorder'&&(
            <div style={S.card}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                <div>
                  <h2 style={{fontSize:'1rem',fontWeight:500,color:'#1a1510',marginBottom:4}}>ترتيب مواقع الصور</h2>
                  <p style={{fontSize:'.76rem',color:'#9a9080'}}>اسحب لتغيير الترتيب · أو استخدم ↑ ↓ · بدون إعادة رفع</p>
                </div>
                <button onClick={saveReorder} disabled={reorderSaving} style={{...S.btn(reorderSaving?'#e0d8d0':'#c8a820'),opacity:reorderSaving?.6:1}}>
                  {reorderSaving?'جاري الحفظ...':'💾 حفظ الترتيب'}
                </button>
              </div>
              {reorderList.length===0?<div style={{textAlign:'center',color:'#c0b8b0',padding:48,border:'2px dashed #e0d8d0',borderRadius:12}}>لا توجد صور</div>
              :<div style={{display:'grid',gap:8}}>
                {reorderList.map((p,i)=>(
                  <div key={p.id} draggable onDragStart={()=>onDragStart(i)} onDragOver={onDragOver(i)} onDrop={()=>onDrop(i)} onDragEnd={()=>{setDragging(null);setDragTarget(null);}}
                    style={{display:'flex',gap:12,alignItems:'center',background:dragging===i?'#f0ebe0':dragTarget===i?'#fdf8ee':'#faf8f5',borderRadius:10,padding:'10px 14px',border:`1.5px solid ${dragTarget===i?'#c8a820':'#e8e0d8'}`,cursor:'grab',userSelect:'none'}}>
                    <div style={{color:'#c0b8b0',fontSize:'1.1rem',cursor:'grab',flexShrink:0}}>⠿</div>
                    <div style={{width:32,height:32,borderRadius:'50%',background:'#1a1510',color:'#f0ece4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.72rem',fontWeight:600,flexShrink:0}}>{i}</div>
                    <img src={p.image_url} alt={p.title} style={{width:58,height:44,objectFit:'cover',borderRadius:6,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:500,fontSize:'.88rem',color:'#1a1510'}}>{p.title}</div>
                      <div style={{fontSize:'.72rem',color:'#9a9080'}}>كان في موقع #{p.position_index}</div>
                    </div>
                    <div style={{display:'flex',gap:4,flexShrink:0}}>
                      <button onClick={()=>moveItem(i,-1)} disabled={i===0} style={{width:30,height:30,borderRadius:6,border:'1px solid #e0d8d0',background:'#fff',cursor:i===0?'not-allowed':'pointer',fontSize:'.8rem',opacity:i===0?.35:1,fontFamily:'inherit'}}>↑</button>
                      <button onClick={()=>moveItem(i,1)} disabled={i===reorderList.length-1} style={{width:30,height:30,borderRadius:6,border:'1px solid #e0d8d0',background:'#fff',cursor:i===reorderList.length-1?'not-allowed':'pointer',fontSize:'.8rem',opacity:i===reorderList.length-1?.35:1,fontFamily:'inherit'}}>↓</button>
                    </div>
                  </div>
                ))}
              </div>}
              <div style={{marginTop:18,padding:14,background:'#fffbee',border:'1px solid #fde68a',borderRadius:8,fontSize:'.76rem',color:'#92400e'}}>
                💡 الترتيب الجديد يعكس تسلسل الصور من الموقع #0 بدون إعادة رفع
              </div>
            </div>
          )}

          {/* ── VISITOR LOG ── */}
          {tab==='visitors'&&(
            <div style={S.card}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                <div>
                  <h2 style={{fontSize:'1rem',fontWeight:500,color:'#1a1510',marginBottom:4}}>سجل الزوار</h2>
                  <p style={{fontSize:'.76rem',color:'#9a9080'}}>إجمالي الزيارات الفريدة: <strong style={{color:'#c8a820'}}>{visitData.count.toLocaleString('ar-SA')}</strong></p>
                </div>
                <button onClick={fetchVisits} style={S.btn('#1a1510')}>🔄 تحديث</button>
              </div>
              {visitData.recent.length===0?<div style={{textAlign:'center',color:'#c0b8b0',padding:48,border:'2px dashed #e0d8d0',borderRadius:12}}>لا توجد زيارات مسجلة بعد</div>
              :<div style={{overflow:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.82rem'}}>
                  <thead>
                    <tr style={{background:'#faf8f5',borderBottom:'2px solid #e8e0d8'}}>
                      {['#','الاسم','التاريخ والوقت','معرّف الجهاز (مشفّر)'].map(h=>(
                        <th key={h} style={{padding:'10px 14px',textAlign:'right',color:'#6a6050',fontWeight:500,whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visitData.recent.map((v,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid #f0ece8',background:i%2===0?'#fff':'#faf8f5'}}>
                        <td style={{padding:'9px 14px',color:'#9a9080'}}>{i+1}</td>
                        <td style={{padding:'9px 14px',color:'#1a1510',fontWeight:v.visitor_name?500:400}}>
                          {v.visitor_name||<span style={{color:'#c0b8b0',fontStyle:'italic'}}>مجهول</span>}
                        </td>
                        <td style={{padding:'9px 14px',color:'#6a6050',whiteSpace:'nowrap'}}>
                          {new Date(v.visited_at).toLocaleString('ar-SA',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                        </td>
                        <td style={{padding:'9px 14px',color:'#b0a898',fontFamily:'monospace',fontSize:'.72rem'}}>{v.ip_hash?.slice(0,12)}...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
