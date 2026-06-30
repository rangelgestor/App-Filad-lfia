import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient";
import {
  parseCifra, transposeChord, transposeKey, FLAT_KEYS, keyDistance, CIFRA_EXEMPLO, SHARP, FLAT,
} from "./transpose";
import {
  Music, Plus, Search, ChevronLeft, RotateCcw, Minus, Eye, ClipboardPaste,
  Link2, Play, User, LogOut, Crown, Star, Calendar, Users, Check, X, Clock,
  BookOpen, Heart, HeartHandshake, Send, Trash2, Sprout, Flame, Trophy, Radio, Pencil, Maximize2,
} from "lucide-react";

/* ===================== HELPERS ===================== */
function youtubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
function YouTubeEmbed({ url }) {
  const id = youtubeId(url);
  if (!id) return <div className="aspect-video bg-indigo-950 rounded-xl flex items-center justify-center text-indigo-300 text-sm text-center px-4">Link do YouTube ausente ou inválido</div>;
  return (
    <div className="aspect-video rounded-xl overflow-hidden bg-black">
      <iframe className="w-full h-full" src={"https://www.youtube.com/embed/" + id} title="YouTube"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
    </div>
  );
}
function noteIndex(n) { let i = SHARP.indexOf(n); if (i >= 0) return i; return FLAT.indexOf(n); }
function tonicaSharp(tom) {
  const m = (tom || "").match(/^([A-G][#b]?)/);
  if (!m) return "C";
  const i = noteIndex(m[1]);
  return i >= 0 ? SHARP[i] : "C";
}

const BIBLE_VERSIONS = [{ id: "nvi", nome: "NVI" }, { id: "acf", nome: "ACF" }, { id: "naa", nome: "NAA" }, { id: "ntlh", nome: "NTLH" }];
const LIVROS = {
  genesis: "genesis", gn: "genesis", exodo: "exodus", ex: "exodus", levitico: "leviticus", lv: "leviticus",
  numeros: "numbers", nm: "numbers", deuteronomio: "deuteronomy", dt: "deuteronomy", josue: "joshua", js: "joshua",
  juizes: "judges", jz: "judges", rute: "ruth", rt: "ruth", "1samuel": "1samuel", "1sm": "1samuel", "2samuel": "2samuel", "2sm": "2samuel",
  "1reis": "1kings", "1rs": "1kings", "2reis": "2kings", "2rs": "2kings", "1cronicas": "1chronicles", "1cr": "1chronicles", "2cronicas": "2chronicles", "2cr": "2chronicles",
  esdras: "ezra", ed: "ezra", neemias: "nehemiah", ne: "nehemiah", ester: "esther", et: "esther", jo: "job",
  salmos: "psalms", salmo: "psalms", sl: "psalms", proverbios: "proverbs", pv: "proverbs", eclesiastes: "ecclesiastes", ec: "ecclesiastes",
  cantares: "song-of-solomon", canticos: "song-of-solomon", ct: "song-of-solomon", isaias: "isaiah", is: "isaiah",
  jeremias: "jeremiah", jr: "jeremiah", lamentacoes: "lamentations", lm: "lamentations", ezequiel: "ezekiel", ez: "ezekiel",
  daniel: "daniel", dn: "daniel", oseias: "hosea", os: "hosea", joel: "joel", jl: "joel", amos: "amos", am: "amos",
  obadias: "obadiah", ob: "obadiah", jonas: "jonah", jn: "jonah", miqueias: "micah", mq: "micah", naum: "nahum", na: "nahum",
  habacuque: "habakkuk", hc: "habakkuk", sofonias: "zephaniah", sf: "zephaniah", ageu: "haggai", ag: "haggai",
  zacarias: "zechariah", zc: "zechariah", malaquias: "malachi", ml: "malachi",
  mateus: "matthew", mt: "matthew", marcos: "mark", mc: "mark", lucas: "luke", lc: "luke", joao: "john",
  atos: "acts", at: "acts", romanos: "romans", rm: "romans", "1corintios": "1corinthians", "1co": "1corinthians", "2corintios": "2corinthians", "2co": "2corinthians",
  galatas: "galatians", gl: "galatians", efesios: "ephesians", ef: "ephesians", filipenses: "philippians", fp: "philippians",
  colossenses: "colossians", cl: "colossians", "1tessalonicenses": "1thessalonians", "1ts": "1thessalonians", "2tessalonicenses": "2thessalonians", "2ts": "2thessalonians",
  "1timoteo": "1timothy", "1tm": "1timothy", "2timoteo": "2timothy", "2tm": "2timothy", tito: "titus", tt: "titus", filemom: "philemon", fm: "philemon",
  hebreus: "hebrews", hb: "hebrews", tiago: "james", tg: "james", "1pedro": "1peter", "1pe": "1peter", "2pedro": "2peter", "2pe": "2peter",
  "1joao": "1john", "2joao": "2john", "3joao": "3john", judas: "jude", jd: "jude", apocalipse: "revelation", ap: "revelation",
};
function normLivro(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""); }
function parseRef(refTxt) {
  const m = (refTxt || "").match(/^\s*(.+?)\s+(\d+)\s*:\s*(\d+)/);
  if (!m) return null;
  const slug = LIVROS[normLivro(m[1])];
  if (!slug) return null;
  return { slug, cap: m[2], ver: m[3] };
}
async function fetchVersiculo(refTxt, versao) {
  const p = parseRef(refTxt);
  if (!p) return null;
  const tentativas = [p.slug];
  if (/^\d/.test(p.slug)) tentativas.push(p.slug.replace(/^(\d)/, "$1-"));
  for (const slug of tentativas) {
    try {
      const r = await fetch("https://api.midvash.com/v1/" + (versao || "nvi") + "/" + slug + "/" + p.cap + "/" + p.ver);
      if (!r.ok) continue;
      const j = await r.json();
      const texto = j && j.data && j.data.text;
      if (texto) return texto;
    } catch (e) { /* rede/CORS — cai no fallback */ }
  }
  return null;
}
function Versiculo({ refTxt, versao }) {
  const [texto, setTexto] = useState(null);
  const [estado, setEstado] = useState("loading");
  useEffect(() => {
    let ativo = true; setEstado("loading"); setTexto(null);
    fetchVersiculo(refTxt, versao).then((t) => { if (!ativo) return; if (t) { setTexto(t); setEstado("ok"); } else setEstado("vazio"); });
    return () => { ativo = false; };
  }, [refTxt, versao]);
  return (
    <div className="border-l-4 border-amber-400 bg-indigo-50/60 rounded-r-lg px-4 py-3 my-3">
      {estado === "loading" && <p className="text-sm text-slate-400 italic">Buscando o versículo...</p>}
      {estado === "ok" && <p className="font-serif italic text-slate-700 leading-relaxed">"{texto}"</p>}
      {estado === "vazio" && <p className="text-sm text-slate-400 italic">Não encontrei este versículo. Confira a referência (ex: João 3:16).</p>}
      <p className="text-xs text-amber-700 font-medium mt-1">{refTxt}{estado === "ok" ? " · " + (versao || "nvi").toUpperCase() : ""}</p>
    </div>
  );
}
function CifraRender({ corpo, steps, useFlat, fontPx = 15, dark = false, cols = 1 }) {
  const linhas = useMemo(() => parseCifra(corpo), [corpo]);
  const colClass = cols === 3 ? "columns-3" : cols === 2 ? "columns-2" : "";
  const corLetra = dark ? "text-slate-100" : "text-slate-800";
  const corAcorde = dark ? "text-amber-400" : "text-amber-600";
  return (
    <div className={"font-mono leading-tight " + colClass} style={{ fontSize: fontPx + "px", columnGap: "2rem" }}>
      {linhas.map((ln, i) => (
        <div key={i} className="break-inside-avoid mb-1">
          {ln.acordes.length > 0 && (<div className="relative" style={{ height: "1.35em" }}>{ln.acordes.map((a, j) => (<span key={j} className={"absolute font-bold whitespace-pre " + corAcorde} style={{ left: a.col + "ch" }}>{transposeChord(a.chord, steps, useFlat)}</span>))}</div>)}
          <div className={"whitespace-pre " + corLetra}>{ln.letra || "\u00A0"}</div>
        </div>
      ))}
    </div>
  );
}

/* ===================== MODO PALCO (tela cheia) ===================== */
function ModoPalco({ song, steps0, onClose }) {
  const [steps, setSteps] = useState(steps0 || 0);
  const [cols, setCols] = useState(2);
  const [fontPx, setFontPx] = useState(15);
  const [dark, setDark] = useState(true);
  const tomAtual = transposeKey(song.tom || "C", steps);
  const useFlat = FLAT_KEYS.has((tomAtual || "").replace(/m$/, ""));
  const bg = dark ? "bg-slate-900" : "bg-white";
  const barBg = dark ? "bg-slate-800" : "bg-stone-100";
  const fg = dark ? "text-slate-100" : "text-slate-900";
  const btn = (dark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900") + " flex items-center justify-center rounded";
  const act = "bg-amber-500 text-indigo-950 flex items-center justify-center rounded font-bold";
  return (
    <div className={"fixed inset-0 z-50 flex flex-col " + bg}>
      <div className={"flex items-center gap-1.5 px-3 py-2 flex-wrap " + barBg}>
        <span className={"font-serif text-base mr-1 truncate max-w-[40%] " + fg}>{song.titulo}</span>
        <span className="font-mono font-bold text-amber-500 mr-1">{tomAtual}</span>
        <button onClick={() => setSteps((s) => s - 1)} className={"w-7 h-7 " + btn}><Minus size={15} /></button>
        <button onClick={() => setSteps((s) => s + 1)} className={"w-7 h-7 " + btn}><Plus size={15} /></button>
        <span className={"mx-1 " + (dark ? "text-slate-600" : "text-stone-300")}>|</span>
        <button onClick={() => setFontPx((f) => Math.max(9, f - 1))} className={"px-1.5 h-7 text-xs " + btn}>A−</button>
        <button onClick={() => setFontPx((f) => Math.min(30, f + 1))} className={"px-1.5 h-7 text-base " + btn}>A+</button>
        <span className={"mx-1 " + (dark ? "text-slate-600" : "text-stone-300")}>|</span>
        {[1, 2, 3].map((c) => (<button key={c} onClick={() => setCols(c)} className={"w-7 h-7 text-sm " + (cols === c ? act : btn)}>{c}</button>))}
        <button onClick={() => setDark((d) => !d)} className={"px-2 h-7 text-xs ml-1 " + btn}>{dark ? "☀ Claro" : "☾ Escuro"}</button>
        <button onClick={onClose} className={"ml-auto w-8 h-8 " + btn}><X size={20} /></button>
      </div>
      <div className="flex-1 overflow-auto px-4 py-3">
        <CifraRender corpo={song.corpo} steps={steps} useFlat={useFlat} fontPx={fontPx} dark={dark} cols={cols} />
      </div>
    </div>
  );
}

/* ===================== LOGIN ===================== */
function Login() {
  const [modo, setModo] = useState("entrar");
  const [nome, setNome] = useState(""); const [email, setEmail] = useState(""); const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(""); const [msg, setMsg] = useState(""); const [carregando, setCarregando] = useState(false);
  async function enviar() {
    setErro(""); setMsg(""); setCarregando(true);
    try {
      if (modo === "criar") {
        const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { data: { nome } } });
        if (error) throw error;
        if (!data.session) setMsg("Conta criada! Se pedir confirmação por e-mail, confirme e entre.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      }
    } catch (e) { setErro(e.message || "Algo deu errado."); }
    setCarregando(false);
  }
  const input = "w-full px-3 py-2.5 rounded-xl border border-indigo-800 bg-indigo-900/40 text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-amber-400";
  return (
    <div className="min-h-screen bg-indigo-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8"><div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto mb-4"><Music size={26} className="text-indigo-950" /></div><h1 className="font-serif text-3xl text-white mb-1">Filadélfia Louvor</h1><p className="text-indigo-300 text-sm">{modo === "criar" ? "Crie sua conta no grupo" : "Entre para acessar o grupo"}</p></div>
        <div className="space-y-3">
          {modo === "criar" && <input className={input} placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} />}
          <input className={input} placeholder="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={input} placeholder="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          {erro && <p className="text-red-300 text-sm">{erro}</p>}
          {msg && <p className="text-emerald-300 text-sm">{msg}</p>}
          <button onClick={enviar} disabled={carregando || !email || !senha} className="w-full bg-amber-500 text-indigo-950 font-medium py-2.5 rounded-xl disabled:opacity-40 hover:bg-amber-400">{carregando ? "Aguarde..." : modo === "criar" ? "Criar conta" : "Entrar"}</button>
          <button onClick={() => { setModo(modo === "criar" ? "entrar" : "criar"); setErro(""); setMsg(""); }} className="w-full text-indigo-300 text-sm hover:text-white">{modo === "criar" ? "Já tenho conta — entrar" : "Não tenho conta — criar"}</button>
        </div>
      </div>
    </div>
  );
}

/* ===================== ABA DE PAD (segue o tom) ===================== */
function PadTab({ perfil, tonica }) {
  const [pad, setPad] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [link, setLink] = useState("");
  const [salvando, setSalvando] = useState(false);
  const podeEditar = perfil.papel === "admin" || perfil.papel === "lider";

  async function carregar() {
    setCarregando(true);
    const { data } = await supabase.from("pads").select("*").eq("grupo_id", perfil.grupo_id).eq("tom", tonica).maybeSingle();
    setPad(data || null); setLink(""); setCarregando(false);
  }
  useEffect(() => { carregar(); }, [tonica]);

  async function salvar() {
    setSalvando(true);
    await supabase.from("pads").upsert({ grupo_id: perfil.grupo_id, tom: tonica, youtube: link }, { onConflict: "grupo_id,tom" });
    setSalvando(false); carregar();
  }

  if (carregando) return <div className="bg-white rounded-2xl border border-stone-200 p-5 text-slate-400 text-sm">Carregando pad...</div>;
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <div className="flex items-center gap-2 mb-3 text-slate-700"><Radio size={16} className="text-amber-500" /><span className="font-medium">Pad em {tonica}</span><span className="text-xs text-slate-400">· segue o tom da música</span></div>
      {pad && pad.youtube ? (
        <YouTubeEmbed url={pad.youtube} />
      ) : podeEditar ? (
        <div>
          <p className="text-sm text-slate-500 mb-2">Nenhum pad cadastrado para {tonica} ainda. Cole o link do YouTube do pad em {tonica}:</p>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtube.com/..." className="w-full px-3 py-2 rounded-xl border border-stone-200 mb-2 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <button onClick={salvar} disabled={!link.trim() || salvando} className="bg-indigo-950 text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-40 hover:bg-indigo-900">{salvando ? "Salvando..." : "Salvar pad de " + tonica}</button>
        </div>
      ) : (
        <p className="text-slate-400 text-sm py-6 text-center">Nenhum pad cadastrado para {tonica} ainda.</p>
      )}
    </div>
  );
}

/* ===================== SONG VIEW ===================== */
function SongView({ song, perfil, onBack }) {
  const [steps, setSteps] = useState(song._steps || 0);
  const [tab, setTab] = useState("cifra");
  const [palco, setPalco] = useState(false);
  const tomAtual = transposeKey(song.tom || "C", steps);
  const useFlat = FLAT_KEYS.has((tomAtual || "").replace(/m$/, ""));
  const tonica = tonicaSharp(tomAtual);
  const letras = useMemo(() => parseCifra(song.corpo).map((l) => l.letra).filter((t) => t && t.trim()), [song.corpo]);
  return (
    <div className="pb-10">
      <button onClick={onBack} className="flex items-center gap-1 text-indigo-700 text-sm font-medium mb-4 hover:underline"><ChevronLeft size={16} /> Voltar</button>
      <h1 className="font-serif text-3xl text-slate-900 leading-tight">{song.titulo}</h1><p className="text-slate-500 mb-5">{song.artista || "—"}</p>
      <div className="flex items-center justify-between bg-indigo-950 rounded-2xl px-4 py-3 mb-5">
        <div><p className="text-indigo-300 text-xs uppercase tracking-wide">Tom</p><p className="text-white font-mono text-2xl font-bold">{tomAtual}</p></div>
        <div className="flex items-center gap-2">
          {steps !== 0 && <button onClick={() => setSteps(0)} className="p-2 text-indigo-300 hover:text-white"><RotateCcw size={18} /></button>}
          <button onClick={() => setSteps((s) => s - 1)} className="w-10 h-10 rounded-full bg-indigo-800 text-white flex items-center justify-center hover:bg-indigo-700"><Minus size={18} /></button>
          <span className="text-indigo-200 text-sm w-10 text-center font-mono">{steps > 0 ? "+" + steps : steps}</span>
          <button onClick={() => setSteps((s) => s + 1)} className="w-10 h-10 rounded-full bg-amber-500 text-indigo-950 flex items-center justify-center hover:bg-amber-400"><Plus size={18} /></button>
        </div>
      </div>
      <div className="flex gap-1 mb-5 bg-stone-100 p-1 rounded-xl w-fit flex-wrap">
        {[["cifra", "Cifra"], ["letra", "Letra"], ["video", "Vídeo"], ["pads", "PADs"]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={"px-4 py-1.5 rounded-lg text-sm font-medium transition " + (tab === t ? "bg-white text-indigo-950 shadow-sm" : "text-slate-500")}>{label}</button>
        ))}
      </div>
      {tab === "cifra" && <div className="bg-white rounded-2xl border border-stone-200 p-5"><div className="flex justify-end mb-2"><button onClick={() => setPalco(true)} className="flex items-center gap-1.5 text-sm text-indigo-700 font-medium hover:underline"><Maximize2 size={15} /> Tela cheia</button></div><CifraRender corpo={song.corpo} steps={steps} useFlat={useFlat} /></div>}
      {tab === "letra" && <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-2 text-lg text-slate-800 leading-relaxed">{letras.map((l, i) => <p key={i}>{l}</p>)}</div>}
      {tab === "video" && <div className="bg-white rounded-2xl border border-stone-200 p-5"><YouTubeEmbed url={song.youtube} /></div>}
      {tab === "pads" && <PadTab perfil={perfil} tonica={tonica} />}
      {palco && <ModoPalco song={song} steps0={steps} onClose={() => setPalco(false)} />}
    </div>
  );
}

/* ===================== ADD SONG ===================== */
function SongForm({ perfil, song, onCancel, onSaved }) {
  const editando = !!song;
  const [titulo, setTitulo] = useState(song?.titulo || ""); const [artista, setArtista] = useState(song?.artista === "—" ? "" : (song?.artista || "")); const [tom, setTom] = useState(song?.tom || "C");
  const [youtube, setYoutube] = useState(song?.youtube || ""); const [corpo, setCorpo] = useState(song?.corpo || ""); const [preview, setPreview] = useState(false);
  const [erro, setErro] = useState(""); const [salvando, setSalvando] = useState(false);
  const podeSalvar = titulo.trim() && corpo.trim();
  const inputCls = "w-full px-3 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400";
  async function salvar() {
    setErro(""); setSalvando(true);
    let error;
    if (editando) {
      ({ error } = await supabase.from("louvores").update({ titulo, artista, tom, youtube, corpo, updated_at: new Date().toISOString() }).eq("id", song.id));
    } else {
      ({ error } = await supabase.from("louvores").insert({ grupo_id: perfil.grupo_id, titulo, artista, tom, youtube, corpo, criado_por: perfil.id }));
    }
    setSalvando(false);
    if (error) { setErro(error.message); return; }
    onSaved();
  }
  return (
    <div className="pb-10">
      <button onClick={onCancel} className="flex items-center gap-1 text-indigo-700 text-sm font-medium mb-4 hover:underline"><ChevronLeft size={16} /> Cancelar</button>
      <h1 className="font-serif text-3xl text-slate-900 mb-5">{editando ? "Editar louvor" : "Novo louvor"}</h1>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="text-sm text-slate-500 mb-1 block">Título</label><input className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
          <div><label className="text-sm text-slate-500 mb-1 block">Artista</label><input className={inputCls} value={artista} onChange={(e) => setArtista(e.target.value)} placeholder="Opcional" /></div>
          <div><label className="text-sm text-slate-500 mb-1 block">Tom original</label><input className={inputCls + " font-mono"} value={tom} onChange={(e) => setTom(e.target.value)} placeholder="Ex: G" /></div>
          <div className="col-span-2"><label className="text-sm text-slate-500 mb-1 block">Link do vídeo (YouTube)</label><input className={inputCls} value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/..." /></div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1"><label className="text-sm text-slate-500">Cifra (cole do Cifra Club)</label><button onClick={() => setCorpo(CIFRA_EXEMPLO)} className="flex items-center gap-1 text-xs text-indigo-700 hover:underline"><ClipboardPaste size={13} /> Usar exemplo</button></div>
          <textarea className={inputCls + " font-mono text-sm h-44"} value={corpo} onChange={(e) => setCorpo(e.target.value)} placeholder={"Cole os acordes em cima da letra:\n\nG          D\nEu me rendo a Ti"} />
        </div>
        {erro && <p className="text-red-500 text-sm">{erro}</p>}
        <div className="flex items-center gap-2">
          <button onClick={() => setPreview((p) => !p)} disabled={!corpo.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-stone-200 text-slate-700 text-sm font-medium disabled:opacity-40 hover:border-amber-400"><Eye size={16} /> {preview ? "Ocultar" : "Pré-visualizar"}</button>
          <button onClick={salvar} disabled={!podeSalvar || salvando} className="flex-1 bg-indigo-950 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-40 hover:bg-indigo-900">{salvando ? "Salvando..." : editando ? "Salvar alterações" : "Salvar louvor"}</button>
        </div>
        {preview && corpo.trim() && (<div><p className="text-sm text-slate-500 mb-2">Como vai ficar (tom {tom}):</p><div className="bg-white rounded-2xl border border-stone-200 p-5"><CifraRender corpo={corpo} steps={0} useFlat={FLAT_KEYS.has((tom || "").replace(/m$/, ""))} /></div></div>)}
      </div>
    </div>
  );
}

/* ===================== REPERTÓRIO ===================== */
function Repertorio({ perfil }) {
  const [louvores, setLouvores] = useState([]); const [q, setQ] = useState("");
  const [carregando, setCarregando] = useState(true); const [aberto, setAberto] = useState(null); const [adicionando, setAdicionando] = useState(false); const [editando, setEditando] = useState(null);
  const podeAdd = perfil.papel === "admin" || perfil.papel === "lider";
  async function carregar() { const { data } = await supabase.from("louvores").select("*").order("created_at", { ascending: false }); setLouvores(data || []); setCarregando(false); }
  useEffect(() => {
    carregar();
    const ch = supabase.channel("louvores-rt").on("postgres_changes", { event: "*", schema: "public", table: "louvores" }, carregar).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  async function excluir(id) { await supabase.from("louvores").delete().eq("id", id); }
  if (adicionando) return <SongForm perfil={perfil} onCancel={() => setAdicionando(false)} onSaved={() => setAdicionando(false)} />;
  if (editando) return <SongForm perfil={perfil} song={editando} onCancel={() => setEditando(null)} onSaved={() => setEditando(null)} />;
  if (aberto) return <SongView song={aberto} perfil={perfil} onBack={() => setAberto(null)} />;
  const list = louvores.filter((s) => (s.titulo || "").toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="pb-10">
      <div className="flex items-start justify-between mb-1"><div><h1 className="font-serif text-3xl text-slate-900">Repertório</h1><p className="text-slate-500">{louvores.length} louvores no grupo</p></div>{podeAdd && <button onClick={() => setAdicionando(true)} className="flex items-center gap-1.5 bg-amber-500 text-indigo-950 text-sm font-medium px-3 py-2 rounded-xl hover:bg-amber-400"><Plus size={16} /> Novo</button>}</div>
      <div className="relative my-5"><Search size={18} className="absolute left-3 top-3 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar louvor..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" /></div>
      {carregando ? <p className="text-slate-400 text-center py-10">Carregando...</p> : list.length === 0 ? (
        <div className="text-center py-12 text-slate-400"><Music size={32} className="mx-auto mb-2 opacity-40" /><p>Nenhum louvor ainda.</p></div>
      ) : (
        <div className="space-y-2">{list.map((s) => (
          <div key={s.id} className="flex items-center gap-2 bg-white rounded-xl border border-stone-200 p-4 hover:border-amber-400 transition">
            <button onClick={() => setAberto(s)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0"><Music size={18} className="text-indigo-700" /></div>
              <div className="min-w-0"><p className="font-medium text-slate-900 truncate">{s.titulo}</p><p className="text-sm text-slate-400 truncate">{s.artista || "—"}</p></div>
            </button>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-mono text-amber-600 font-bold">{s.tom || "—"}</span>
              {podeAdd && <button onClick={() => setEditando(s)} className="text-slate-300 hover:text-indigo-600 p-1"><Pencil size={15} /></button>}
              {podeAdd && <button onClick={() => { if (window.confirm("Excluir este louvor?")) excluir(s.id); }} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={15} /></button>}
            </div>
          </div>
        ))}</div>
      )}
    </div>
  );
}

/* ===================== DASHBOARD (agenda de domingos) ===================== */
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function dataPartes(d) { if (!d) return null; const [a, m, dia] = d.split("-").map(Number); return new Date(a, m - 1, dia); }
function fmtCurto(d) { const dt = dataPartes(d); if (!dt) return ""; return dt.getDate() + "/" + (dt.getMonth() + 1); }
function fmtLongo(d) { const dt = dataPartes(d); if (!dt) return ""; return DIAS[dt.getDay()] + ", " + dt.getDate() + " " + MESES[dt.getMonth()]; }
function proximoDomingo() { const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); return d.toISOString().slice(0, 10); }

function Dashboard({ perfil, membros, onOpenSong }) {
  const [ensaios, setEnsaios] = useState([]); const [selId, setSelId] = useState(null);
  const [playlist, setPlaylist] = useState([]); const [escala, setEscala] = useState([]);
  const [songs, setSongs] = useState([]); const [carregando, setCarregando] = useState(true);
  const [recusando, setRecusando] = useState(false); const [motivo, setMotivo] = useState("");
  const [novaData, setNovaData] = useState(proximoDomingo()); const [criando, setCriando] = useState(false);
  const podeEditar = perfil.papel === "admin" || perfil.papel === "lider";
  const selIdRef = useRef(null);

  async function carregarEnsaios() {
    const { data } = await supabase.from("ensaios").select("*").order("data", { ascending: true });
    setEnsaios(data || []); setCarregando(false);
    return data || [];
  }
  async function carregarDetalhe(id) {
    if (!id) { setPlaylist([]); setEscala([]); return; }
    const { data: pl } = await supabase.from("ensaio_louvores").select("*, louvores(*)").eq("ensaio_id", id).order("ordem");
    setPlaylist(pl || []);
    const { data: esc } = await supabase.from("escalas").select("*").eq("ensaio_id", id);
    setEscala(esc || []);
  }
  useEffect(() => {
    (async () => {
      const ens = await carregarEnsaios();
      const { data: sg } = await supabase.from("louvores").select("id,titulo,tom").order("titulo");
      setSongs(sg || []);
      if (ens.length) {
        const hoje = new Date().toISOString().slice(0, 10);
        const futuro = ens.find((e) => e.data >= hoje) || ens[ens.length - 1];
        setSelId(futuro.id);
      }
    })();
    const ch = supabase.channel("dash-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "ensaios" }, carregarEnsaios)
      .on("postgres_changes", { event: "*", schema: "public", table: "ensaio_louvores" }, () => carregarDetalhe(selIdRef.current))
      .on("postgres_changes", { event: "*", schema: "public", table: "escalas" }, () => carregarDetalhe(selIdRef.current)).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  useEffect(() => { selIdRef.current = selId; carregarDetalhe(selId); }, [selId]);

  async function criarEnsaio() {
    if (!novaData) return; setCriando(true);
    const { data } = await supabase.from("ensaios").insert({ grupo_id: perfil.grupo_id, titulo: "Culto", data: novaData, criado_por: perfil.id }).select().single();
    setCriando(false);
    const ens = await carregarEnsaios();
    if (data) setSelId(data.id);
  }
  async function excluirEnsaio(id) {
    await supabase.from("ensaios").delete().eq("id", id);
    const ens = await carregarEnsaios();
    if (id === selId) setSelId(ens.length ? ens[0].id : null);
  }
  async function responder(status, mot) {
    const minha = escala.find((e) => e.membro_id === perfil.id);
    if (minha) await supabase.from("escalas").update({ status, motivo: mot || "" }).eq("id", minha.id);
    setRecusando(false); setMotivo("");
  }
  async function addMusica(songId, tom) { await supabase.from("ensaio_louvores").insert({ ensaio_id: selId, louvor_id: songId, tom_escolhido: tom, ordem: playlist.length }); }
  async function removeMusica(id) { await supabase.from("ensaio_louvores").delete().eq("id", id); }
  async function addEscala(memberId, funcao) { await supabase.from("escalas").insert({ ensaio_id: selId, membro_id: memberId, funcao, status: "pendente" }); }
  async function removeEscala(id) { await supabase.from("escalas").delete().eq("id", id); }

  if (carregando) return <p className="text-slate-400 text-center py-10">Carregando...</p>;

  const ensaio = ensaios.find((e) => e.id === selId) || null;
  const minha = escala.find((e) => e.membro_id === perfil.id);
  const vao = escala.filter((e) => e.status === "vou").length, nao = escala.filter((e) => e.status === "nao_vou").length, pend = escala.filter((e) => e.status === "pendente").length;
  const naoEscalados = membros.filter((m) => !escala.some((e) => e.membro_id === m.id));

  return (
    <div className="pb-10">
      <div className="flex items-center gap-2 mb-1"><Calendar size={22} className="text-indigo-700" /><h1 className="font-serif text-3xl text-slate-900">Agenda</h1></div>
      <p className="text-slate-500 mb-4">Domingos e escalas do grupo</p>

      {podeEditar && (
        <div className="flex items-center gap-2 mb-4 bg-stone-50 rounded-xl p-3 border border-stone-200">
          <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm" />
          <button onClick={criarEnsaio} disabled={!novaData || criando} className="flex items-center gap-1 bg-amber-500 text-indigo-950 text-sm font-medium px-3 py-2 rounded-lg hover:bg-amber-400 disabled:opacity-40"><Plus size={15} /> Domingo</button>
        </div>
      )}

      {ensaios.length === 0 ? (
        <div className="text-center py-12 text-slate-400"><Calendar size={32} className="mx-auto mb-2 opacity-40" /><p>Nenhum domingo na agenda ainda.</p>{podeEditar && <p className="text-sm mt-1">Escolha uma data acima para criar.</p>}</div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-1 px-1">
            {ensaios.map((e) => { const ativo = e.id === selId; const passado = e.data < new Date().toISOString().slice(0, 10); return (
              <button key={e.id} onClick={() => setSelId(e.id)} className={"flex-shrink-0 flex flex-col items-center px-4 py-2 rounded-xl border transition " + (ativo ? "bg-indigo-950 text-white border-indigo-950" : passado ? "bg-white text-slate-300 border-stone-200" : "bg-white text-slate-700 border-stone-200 hover:border-amber-400")}>
                <span className="text-[10px] uppercase tracking-wide">{DIAS[dataPartes(e.data)?.getDay() ?? 0]}</span>
                <span className="font-mono font-bold text-sm">{fmtCurto(e.data)}</span>
              </button>
            ); })}
          </div>

          {ensaio && (<>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-2xl text-slate-900">{fmtLongo(ensaio.data)}</h2>
              {podeEditar && <button onClick={() => { if (window.confirm("Excluir este domingo e sua escala?")) excluirEnsaio(ensaio.id); }} className="flex items-center gap-1 text-slate-300 hover:text-red-500 text-sm"><Trash2 size={15} /></button>}
            </div>

      {minha && minha.status === "pendente" && !recusando && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5"><div className="flex items-center gap-2 text-amber-900 mb-3"><Clock size={18} /> <span className="text-sm">Você está escalado(a) no {minha.funcao || "ministério"}. Vai poder?</span></div><div className="flex gap-2"><button onClick={() => responder("vou")} className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-emerald-500"><Check size={16} /> Vou</button><button onClick={() => setRecusando(true)} className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-stone-300 text-slate-700 text-sm font-medium py-2 rounded-lg hover:border-red-300"><X size={16} /> Não vou</button></div></div>
      )}
      {minha && minha.status === "pendente" && recusando && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 mb-5"><p className="text-sm text-slate-600 mb-2">Quer deixar um motivo? (opcional)</p><input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: trabalho, viagem..." className="w-full px-3 py-2 rounded-lg border border-stone-200 mb-3 focus:outline-none focus:ring-2 focus:ring-amber-400" /><div className="flex gap-2"><button onClick={() => responder("nao_vou", motivo)} className="flex-1 bg-slate-800 text-white text-sm font-medium py-2 rounded-lg hover:bg-slate-700">Confirmar ausência</button><button onClick={() => setRecusando(false)} className="px-4 text-sm text-slate-500">Voltar</button></div></div>
      )}
      {minha && minha.status === "vou" && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5 flex items-center justify-between"><span className="flex items-center gap-2 text-emerald-800 text-sm"><Check size={18} /> Você confirmou presença!</span><button onClick={() => responder("pendente")} className="text-xs text-emerald-700 hover:underline">alterar</button></div>}
      {minha && minha.status === "nao_vou" && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex items-center justify-between"><span className="flex items-center gap-2 text-red-800 text-sm"><X size={18} /> Você marcou que não vai.</span><button onClick={() => responder("pendente")} className="text-xs text-red-700 hover:underline">alterar</button></div>}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3"><Music size={18} className="text-indigo-700" /><h2 className="font-medium text-slate-900">Músicas do fim de semana</h2></div>
        <div className="space-y-2">{playlist.map((p, i) => { const song = p.louvores; if (!song) return null; const steps = keyDistance(song.tom, p.tom_escolhido || song.tom); return (
          <div key={p.id} className="flex items-center justify-between bg-white rounded-xl border border-stone-200 p-4">
            <button onClick={() => onOpenSong({ ...song, _steps: steps })} className="flex items-center gap-3 text-left flex-1"><span className="w-6 text-center font-serif text-slate-300 text-lg">{i + 1}</span><div><p className="font-medium text-slate-900">{song.titulo}</p><p className="text-sm text-slate-400">Tom {p.tom_escolhido || song.tom}</p></div></button>
            {podeEditar && <button onClick={() => removeMusica(p.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={15} /></button>}
          </div>
        ); })}</div>
        {podeEditar && <AdminAddMusica songs={songs} onAdd={addMusica} />}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Users size={18} className="text-indigo-700" /><h2 className="font-medium text-slate-900">Quem toca neste domingo</h2></div><span className="text-sm text-slate-400">{vao} vão · {nao} não · {pend} pendente</span></div>
        <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100">{escala.map((e) => { const mem = membros.find((m) => m.id === e.membro_id); return (
          <div key={e.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center"><User size={16} className="text-slate-500" /></div><div><p className="font-medium text-slate-900 flex items-center gap-1">{mem?.nome || "—"}{mem?.papel === "admin" && <Crown size={13} className="text-amber-500" />}{mem?.papel === "lider" && <Star size={12} className="text-indigo-400" />}</p><p className="text-sm text-slate-400">{e.funcao}{e.status === "nao_vou" && e.motivo && <span className="text-red-400"> · {e.motivo}</span>}</p></div></div>
            <div className="flex items-center gap-2">
              {e.status === "vou" && <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium"><Check size={16} /> Vou</span>}
              {e.status === "nao_vou" && <span className="flex items-center gap-1 text-red-500 text-sm font-medium"><X size={16} /> Não vou</span>}
              {e.status === "pendente" && <span className="text-slate-400 text-sm">Pendente</span>}
              {podeEditar && <button onClick={() => removeEscala(e.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>}
            </div>
          </div>
        ); })}</div>
        {podeEditar && naoEscalados.length > 0 && <AdminAddEscala membros={naoEscalados} onAdd={addEscala} />}
      </div>
          </>)}
        </>
      )}
    </div>
  );
}
function AdminAddMusica({ songs, onAdd }) {
  const [songId, setSongId] = useState(""); const [tom, setTom] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 bg-stone-50 rounded-xl p-3 border border-stone-200">
      <select value={songId} onChange={(e) => { setSongId(e.target.value); const s = songs.find((x) => x.id === e.target.value); setTom(s?.tom || ""); }} className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm"><option value="">+ Adicionar música...</option>{songs.map((s) => <option key={s.id} value={s.id}>{s.titulo}</option>)}</select>
      <input value={tom} onChange={(e) => setTom(e.target.value)} placeholder="Tom" className="w-16 px-2 py-2 rounded-lg border border-stone-200 text-sm font-mono" />
      <button onClick={() => { if (songId) { onAdd(songId, tom); setSongId(""); setTom(""); } }} disabled={!songId} className="bg-indigo-950 text-white text-sm px-3 py-2 rounded-lg disabled:opacity-40">Add</button>
    </div>
  );
}
function AdminAddEscala({ membros, onAdd }) {
  const [memberId, setMemberId] = useState(""); const [funcao, setFuncao] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 bg-stone-50 rounded-xl p-3 border border-stone-200">
      <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm"><option value="">+ Escalar alguém...</option>{membros.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</select>
      <input value={funcao} onChange={(e) => setFuncao(e.target.value)} placeholder="Função" className="w-28 px-2 py-2 rounded-lg border border-stone-200 text-sm" />
      <button onClick={() => { if (memberId) { onAdd(memberId, funcao); setMemberId(""); setFuncao(""); } }} disabled={!memberId} className="bg-indigo-950 text-white text-sm px-3 py-2 rounded-lg disabled:opacity-40">Add</button>
    </div>
  );
}

/* ===================== DEVOCIONAL ===================== */
function PostCard({ post, perfil, versao, onReagir, onComentar, onRemover }) {
  const [txt, setTxt] = useState("");
  const autor = post.membros;
  const amem = (post.devocional_reacoes || []).filter((r) => r.tipo === "amem");
  const orar = (post.devocional_reacoes || []).filter((r) => r.tipo === "orar");
  const euAmem = amem.some((r) => r.membro_id === perfil.id);
  const euOrar = orar.some((r) => r.membro_id === perfil.id);
  const coments = post.devocional_comentarios || [];
  const podeRemover = perfil.papel === "admin" || post.autor_id === perfil.id;
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="flex items-start justify-between"><div className="flex items-center gap-2"><div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center"><User size={16} className="text-indigo-700" /></div><div><p className="font-medium text-slate-900 flex items-center gap-1 text-sm">{autor?.nome || "—"}{autor?.papel === "admin" && <Crown size={12} className="text-amber-500" />}{autor?.papel === "lider" && <Star size={11} className="text-indigo-400" />}</p></div></div>{podeRemover && <button onClick={() => onRemover(post.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={15} /></button>}</div>
      <p className="text-slate-700 mt-3 leading-relaxed">{post.texto}</p>
      {post.referencia && <Versiculo refTxt={post.referencia} versao={versao} />}
      <div className="flex items-center gap-2 mt-2">
        <button onClick={() => onReagir(post, "amem", euAmem)} className={"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition " + (euAmem ? "bg-amber-100 text-amber-800" : "bg-stone-50 text-slate-500 hover:bg-stone-100")}><Heart size={14} className={euAmem ? "fill-amber-500 text-amber-500" : ""} /> Amém {amem.length > 0 && amem.length}</button>
        <button onClick={() => onReagir(post, "orar", euOrar)} className={"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition " + (euOrar ? "bg-indigo-100 text-indigo-800" : "bg-stone-50 text-slate-500 hover:bg-stone-100")}><HeartHandshake size={14} /> Vou orar {orar.length > 0 && orar.length}</button>
      </div>
      {coments.length > 0 && <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">{coments.map((c) => (<div key={c.id} className="flex gap-2 text-sm"><span className="font-medium text-slate-700">{c.membros?.nome || "—"}</span><span className="text-slate-500">{c.texto}</span></div>))}</div>}
      <div className="flex items-center gap-2 mt-3"><input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Comentar..." className="flex-1 px-3 py-1.5 rounded-full border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" /><button onClick={() => { if (txt.trim()) { onComentar(post.id, txt); setTxt(""); } }} className="w-8 h-8 rounded-full bg-indigo-950 text-white flex items-center justify-center hover:bg-indigo-900"><Send size={14} /></button></div>
    </div>
  );
}
function Devocional({ perfil }) {
  const [posts, setPosts] = useState([]); const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState(""); const [ref, setRef] = useState("");
  const [versao, setVersao] = useState(() => { try { return localStorage.getItem("biblia_versao") || "nvi"; } catch (e) { return "nvi"; } });
  function mudarVersao(v) { setVersao(v); try { localStorage.setItem("biblia_versao", v); } catch (e) {} }
  const refValida = !!parseRef(ref);
  async function carregar() {
    const { data } = await supabase.from("devocionais").select("*, membros(nome,papel), devocional_reacoes(membro_id,tipo), devocional_comentarios(id,texto,membros(nome))").order("created_at", { ascending: false });
    setPosts(data || []); setCarregando(false);
  }
  useEffect(() => {
    carregar();
    const ch = supabase.channel("devoc-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "devocionais" }, carregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "devocional_reacoes" }, carregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "devocional_comentarios" }, carregar).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  async function publicar() { if (!texto.trim()) return; await supabase.from("devocionais").insert({ grupo_id: perfil.grupo_id, autor_id: perfil.id, texto, referencia: ref.trim() }); setTexto(""); setRef(""); }
  async function reagir(post, tipo, jaReagiu) {
    if (jaReagiu) await supabase.from("devocional_reacoes").delete().eq("devocional_id", post.id).eq("membro_id", perfil.id).eq("tipo", tipo);
    else await supabase.from("devocional_reacoes").insert({ devocional_id: post.id, membro_id: perfil.id, tipo });
  }
  async function comentar(postId, txt) { await supabase.from("devocional_comentarios").insert({ devocional_id: postId, autor_id: perfil.id, texto: txt }); }
  async function remover(postId) { await supabase.from("devocionais").delete().eq("id", postId); }
  return (
    <div className="pb-10">
      <div className="flex items-center gap-2 mb-1"><BookOpen size={22} className="text-indigo-700" /><h1 className="font-serif text-3xl text-slate-900">Devocional</h1></div><p className="text-slate-500 mb-4">Mural de edificação do grupo</p>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="text-xs text-slate-400">Minha versão da Bíblia:</span>
        {BIBLE_VERSIONS.map((v) => (<button key={v.id} onClick={() => mudarVersao(v.id)} className={"px-2.5 py-1 rounded-full text-xs font-medium transition " + (versao === v.id ? "bg-indigo-950 text-white" : "bg-stone-100 text-slate-500 hover:bg-stone-200")}>{v.nome}</button>))}
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-6">
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Compartilhe uma palavra, um testemunho, uma oração..." className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm h-20 focus:outline-none focus:ring-2 focus:ring-amber-400" />
        <div className="flex items-center gap-2 mt-2"><BookOpen size={16} className="text-slate-400" /><input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Referência (ex: João 3:16, Provérbios 3:5)" className="flex-1 px-3 py-1.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" /></div>
        {ref.trim() && (refValida ? <Versiculo refTxt={ref} versao={versao} /> : <p className="text-xs text-slate-400 mt-2 italic">Digite no formato Livro Capítulo:Versículo (ex: João 3:16).</p>)}
        <button onClick={publicar} disabled={!texto.trim()} className="w-full mt-3 bg-amber-500 text-indigo-950 text-sm font-medium py-2.5 rounded-xl disabled:opacity-40 hover:bg-amber-400">Publicar no mural</button>
      </div>
      {carregando ? <p className="text-slate-400 text-center py-10">Carregando...</p> : posts.length === 0 ? <p className="text-slate-400 text-center py-10">Seja o primeiro a compartilhar uma palavra.</p> : (
        <div className="space-y-3">{posts.map((p) => <PostCard key={p.id} post={p} perfil={perfil} versao={versao} onReagir={reagir} onComentar={comentar} onRemover={remover} />)}</div>
      )}
    </div>
  );
}

/* ===================== CRESCER (vídeos + ranking) ===================== */
function VideoPlayer({ video, jaConcluido, onConcluir, onBack }) {
  const [salvando, setSalvando] = useState(false);
  return (
    <div className="pb-10">
      <button onClick={onBack} className="flex items-center gap-1 text-indigo-700 text-sm font-medium mb-4 hover:underline"><ChevronLeft size={16} /> Voltar</button>
      <h1 className="font-serif text-2xl text-slate-900 leading-tight mb-1">{video.titulo}</h1><p className="text-slate-500 mb-4 text-sm">{video.semana_atual ? "Esta semana" : "Conteúdo anterior"}</p>
      <YouTubeEmbed url={video.youtube} />
      <div className="bg-white rounded-2xl border border-stone-200 p-4 mt-4">
        {jaConcluido ? (
          <div className="flex items-center gap-2 text-emerald-600 font-medium"><Check size={18} /> Você já assistiu este conteúdo</div>
        ) : (
          <button onClick={async () => { setSalvando(true); await onConcluir(); setSalvando(false); }} disabled={salvando} className="w-full bg-indigo-950 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-indigo-900 disabled:opacity-40 flex items-center justify-center gap-2"><Check size={16} /> {salvando ? "Registrando..." : "Marcar como assistido"}</button>
        )}
        <p className="text-xs text-slate-400 mt-2">Assista ao vídeo acima e marque como assistido para pontuar no ranking de fidelidade.</p>
      </div>
    </div>
  );
}
function VideoForm({ perfil, video, onCancel, onSaved }) {
  const editando = !!video;
  const [titulo, setTitulo] = useState(video?.titulo || ""); const [youtube, setYoutube] = useState(video?.youtube || ""); const [salvando, setSalvando] = useState(false);
  const inputCls = "w-full px-3 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400";
  async function salvar() {
    setSalvando(true);
    if (editando) {
      await supabase.from("videos").update({ titulo, youtube }).eq("id", video.id);
    } else {
      await supabase.from("videos").update({ semana_atual: false }).eq("grupo_id", perfil.grupo_id);
      await supabase.from("videos").insert({ grupo_id: perfil.grupo_id, titulo, youtube, semana_atual: true, postado_por: perfil.id });
    }
    setSalvando(false); onSaved();
  }
  return (
    <div className="pb-10">
      <button onClick={onCancel} className="flex items-center gap-1 text-indigo-700 text-sm font-medium mb-4 hover:underline"><ChevronLeft size={16} /> Cancelar</button>
      <h1 className="font-serif text-3xl text-slate-900 mb-5">{editando ? "Editar conteúdo" : "Novo conteúdo"}</h1>
      <div className="space-y-4">
        <div><label className="text-sm text-slate-500 mb-1 block">Título do vídeo</label><input className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Vivendo pela fé" /></div>
        <div><label className="text-sm text-slate-500 mb-1 block">Link do YouTube</label><input className={inputCls} value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/..." /></div>
        <button onClick={salvar} disabled={!titulo.trim() || salvando} className="w-full bg-indigo-950 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-40 hover:bg-indigo-900">{salvando ? "Salvando..." : editando ? "Salvar alterações" : "Publicar para o grupo"}</button>
      </div>
    </div>
  );
}
function Crescer({ perfil, membros }) {
  const [videos, setVideos] = useState([]); const [progresso, setProgresso] = useState([]); const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState(null); const [adicionando, setAdicionando] = useState(false); const [editando, setEditando] = useState(null);
  const podeEditar = perfil.papel === "admin" || perfil.papel === "lider";
  async function carregar() {
    const { data: vd } = await supabase.from("videos").select("*, membros(nome)").order("created_at", { ascending: false });
    setVideos(vd || []);
    const { data: pr } = await supabase.from("progresso").select("*");
    setProgresso(pr || []);
    setCarregando(false);
  }
  useEffect(() => {
    carregar();
    const ch = supabase.channel("crescer-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "videos" }, carregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "progresso" }, carregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "membros" }, carregar).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function concluir(video) {
    const ja = progresso.some((p) => p.video_id === video.id && p.membro_id === perfil.id && p.concluido);
    if (ja) return;
    await supabase.from("progresso").upsert({ video_id: video.id, membro_id: perfil.id, concluido: true, concluido_em: new Date().toISOString() }, { onConflict: "video_id,membro_id" });
    if (video.semana_atual) {
      const meu = membros.find((m) => m.id === perfil.id);
      await supabase.from("membros").update({ streak: (meu?.streak || 0) + 1 }).eq("id", perfil.id);
    }
  }
  async function excluir(id) { await supabase.from("videos").delete().eq("id", id); }

  const ranking = useMemo(() => membros.map((m) => {
    const feitos = progresso.filter((p) => p.membro_id === m.id && p.concluido).length;
    return { ...m, feitos, pontos: feitos * 10 + (m.streak || 0) * 5 };
  }).sort((a, b) => b.pontos - a.pontos), [membros, progresso]);

  if (adicionando) return <VideoForm perfil={perfil} onCancel={() => setAdicionando(false)} onSaved={() => setAdicionando(false)} />;
  if (editando) return <VideoForm perfil={perfil} video={editando} onCancel={() => setEditando(null)} onSaved={() => setEditando(null)} />;
  if (aberto) { const v = videos.find((x) => x.id === aberto); const jc = progresso.some((p) => p.video_id === aberto && p.membro_id === perfil.id && p.concluido); return <VideoPlayer video={v} jaConcluido={jc} onConcluir={() => concluir(v)} onBack={() => setAberto(null)} />; }
  if (carregando) return <p className="text-slate-400 text-center py-10">Carregando...</p>;

  return (
    <div className="pb-10">
      <div className="flex items-start justify-between mb-1"><div><div className="flex items-center gap-2"><Sprout size={22} className="text-emerald-600" /><h1 className="font-serif text-3xl text-slate-900">Crescer</h1></div><p className="text-slate-500">Conteúdo de edificação do grupo</p></div>{podeEditar && <button onClick={() => setAdicionando(true)} className="flex items-center gap-1.5 bg-amber-500 text-indigo-950 text-sm font-medium px-3 py-2 rounded-xl hover:bg-amber-400"><Plus size={16} /> Vídeo</button>}</div>
      <div className="space-y-2 my-5">{videos.length === 0 ? <p className="text-slate-400 text-center py-8">Nenhum conteúdo ainda.</p> : videos.map((v) => { const jc = progresso.some((p) => p.video_id === v.id && p.membro_id === perfil.id && p.concluido); return (
        <div key={v.id} className="flex items-center gap-3 bg-white rounded-xl border border-stone-200 p-4 hover:border-amber-400 transition">
          <button onClick={() => setAberto(v.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <div className="w-12 h-12 rounded-lg bg-indigo-950 flex items-center justify-center flex-shrink-0"><Play size={18} className="text-amber-500" /></div>
            <div className="flex-1 min-w-0"><p className="font-medium text-slate-900 truncate">{v.titulo}</p><p className="text-sm text-slate-400">{v.semana_atual ? "Esta semana" : "Anterior"} · por {v.membros?.nome || "—"}</p></div>
          </button>
          <div className="flex items-center gap-2 flex-shrink-0">
            {jc ? <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium"><Check size={16} /> Assistido</span> : v.semana_atual ? <span className="text-amber-600 text-xs font-medium bg-amber-50 px-2 py-1 rounded-full">Nova</span> : null}
            {podeEditar && <button onClick={() => setEditando(v)} className="text-slate-300 hover:text-indigo-600 p-1"><Pencil size={15} /></button>}
            {podeEditar && <button onClick={() => { if (window.confirm("Excluir este vídeo?")) excluir(v.id); }} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={15} /></button>}
          </div>
        </div>
      ); })}</div>
      <div className="flex items-center gap-2 mb-3 mt-7"><Trophy size={18} className="text-amber-500" /><h2 className="font-medium text-slate-900">Ranking de fidelidade</h2></div>
      <p className="text-xs text-slate-400 mb-3 leading-relaxed">Pontos por conteúdo concluído e por sequência de semanas — premia a constância, não o tempo de tela.</p>
      <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100">{ranking.map((m, i) => { const eu = m.id === perfil.id; return (
        <div key={m.id} className={"flex items-center justify-between p-4 " + (eu ? "bg-amber-50/50" : "")}>
          <div className="flex items-center gap-3"><span className={"w-7 text-center font-serif text-lg " + (i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-slate-300")}>{i + 1}</span><div><p className="font-medium text-slate-900 flex items-center gap-1">{m.nome}{eu && <span className="text-xs text-amber-700">(você)</span>}{m.papel === "admin" && <Crown size={12} className="text-amber-500" />}{m.papel === "lider" && <Star size={11} className="text-indigo-400" />}</p><p className="text-sm text-slate-400 flex items-center gap-2">{(m.streak || 0) > 0 && <span className="flex items-center gap-0.5 text-orange-500"><Flame size={13} /> {m.streak} sem.</span>}<span>{m.feitos} concluídos</span></p></div></div>
          <span className="font-mono font-bold text-indigo-950">{m.pontos}</span>
        </div>
      ); })}</div>
    </div>
  );
}

/* ===================== APP ===================== */
export default function App() {
  const [session, setSession] = useState(null); const [perfil, setPerfil] = useState(null); const [carregando, setCarregando] = useState(true);
  const [tab, setTab] = useState("dashboard"); const [membros, setMembros] = useState([]); const [songFromDash, setSongFromDash] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setCarregando(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setPerfil(null); return; }
    let ativo = true;
    (async () => {
      const { data } = await supabase.from("membros").select("*").eq("id", session.user.id).single();
      if (ativo) setPerfil(data);
      const { data: ms } = await supabase.from("membros").select("*").order("nome");
      if (ativo) setMembros(ms || []);
    })();
    return () => { ativo = false; };
  }, [session, tab]);

  if (carregando) return <div className="min-h-screen bg-indigo-950 flex items-center justify-center text-indigo-300">Carregando...</div>;
  if (!session) return <Login />;

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800">
      <header className="bg-indigo-950 text-white sticky top-0 z-10"><div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center"><Music size={16} className="text-indigo-950" /></div><span className="font-serif text-lg">Filadélfia Louvor</span></div><div className="flex items-center gap-3 text-sm text-indigo-200"><span className="flex items-center gap-1">{perfil?.nome || session.user.email}{perfil?.papel === "admin" && <Crown size={13} className="text-amber-500" />}{perfil?.papel === "lider" && <Star size={12} className="text-indigo-300" />}</span><button onClick={() => supabase.auth.signOut()} className="hover:text-white"><LogOut size={18} /></button></div></div></header>

      <main className="max-w-2xl mx-auto px-5 py-6">
        {!perfil ? <p className="text-slate-400 text-center py-10">Carregando seu perfil...</p>
          : songFromDash ? <SongView song={songFromDash} perfil={perfil} onBack={() => setSongFromDash(null)} />
          : tab === "repertorio" ? <Repertorio perfil={perfil} />
          : tab === "devocional" ? <Devocional perfil={perfil} />
          : tab === "crescer" ? <Crescer perfil={perfil} membros={membros} />
          : <Dashboard perfil={perfil} membros={membros} onOpenSong={(s) => setSongFromDash(s)} />}
      </main>

      {!songFromDash && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200"><div className="max-w-2xl mx-auto flex">{[
          { id: "dashboard", label: "Domingo", Icon: Calendar },
          { id: "repertorio", label: "Repertório", Icon: Music },
          { id: "devocional", label: "Devocional", Icon: BookOpen },
          { id: "crescer", label: "Crescer", Icon: Sprout },
        ].map(({ id, label, Icon }) => (<button key={id} onClick={() => setTab(id)} className={"flex-1 flex flex-col items-center gap-1 py-3 transition " + (tab === id ? "text-indigo-950" : "text-slate-400")}><Icon size={20} /><span className="text-[11px] font-medium">{label}</span></button>))}</div></nav>
      )}
    </div>
  );
}
