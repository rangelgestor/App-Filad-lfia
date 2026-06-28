import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import {
  parseCifra, transposeChord, transposeKey, FLAT_KEYS, CIFRA_EXEMPLO,
} from "./transpose";
import {
  Music, Plus, Search, ChevronLeft, RotateCcw, Minus, Eye, ClipboardPaste,
  Link2, Play, User, LogOut, Crown, Star,
} from "lucide-react";

/* ===================== CIFRA RENDER ===================== */
function CifraRender({ corpo, steps, useFlat }) {
  const linhas = useMemo(() => parseCifra(corpo), [corpo]);
  return (
    <div className="font-mono text-[15px] leading-tight space-y-1 overflow-x-auto">
      {linhas.map((ln, i) => (
        <div key={i}>
          {ln.acordes.length > 0 && (
            <div className="relative h-5">
              {ln.acordes.map((a, j) => (
                <span key={j} className="absolute text-amber-600 font-bold whitespace-pre" style={{ left: a.col + "ch" }}>
                  {transposeChord(a.chord, steps, useFlat)}
                </span>
              ))}
            </div>
          )}
          <div className="whitespace-pre text-slate-800">{ln.letra || "\u00A0"}</div>
        </div>
      ))}
    </div>
  );
}

/* ===================== LOGIN ===================== */
function Login() {
  const [modo, setModo] = useState("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    setErro(""); setMsg(""); setCarregando(true);
    try {
      if (modo === "criar") {
        const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { data: { nome } } });
        if (error) throw error;
        if (!data.session) setMsg("Conta criada! Se pedir confirmação por e-mail, confirme e depois entre.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      }
    } catch (e) {
      setErro(e.message || "Algo deu errado.");
    }
    setCarregando(false);
  }

  const input = "w-full px-3 py-2.5 rounded-xl border border-indigo-800 bg-indigo-900/40 text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-amber-400";
  return (
    <div className="min-h-screen bg-indigo-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto mb-4"><Music size={26} className="text-indigo-950" /></div>
          <h1 className="font-serif text-3xl text-white mb-1">Filadélfia Louvor</h1>
          <p className="text-indigo-300 text-sm">{modo === "criar" ? "Crie sua conta no grupo" : "Entre para acessar o grupo"}</p>
        </div>
        <div className="space-y-3">
          {modo === "criar" && <input className={input} placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} />}
          <input className={input} placeholder="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={input} placeholder="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          {erro && <p className="text-red-300 text-sm">{erro}</p>}
          {msg && <p className="text-emerald-300 text-sm">{msg}</p>}
          <button onClick={enviar} disabled={carregando || !email || !senha} className="w-full bg-amber-500 text-indigo-950 font-medium py-2.5 rounded-xl disabled:opacity-40 hover:bg-amber-400">
            {carregando ? "Aguarde..." : modo === "criar" ? "Criar conta" : "Entrar"}
          </button>
          <button onClick={() => { setModo(modo === "criar" ? "entrar" : "criar"); setErro(""); setMsg(""); }} className="w-full text-indigo-300 text-sm hover:text-white">
            {modo === "criar" ? "Já tenho conta — entrar" : "Não tenho conta — criar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== SONG VIEW ===================== */
function SongView({ song, onBack }) {
  const [steps, setSteps] = useState(0);
  const [tab, setTab] = useState("cifra");
  const tomAtual = transposeKey(song.tom || "C", steps);
  const useFlat = FLAT_KEYS.has((tomAtual || "").replace(/m$/, ""));
  const letras = useMemo(() => parseCifra(song.corpo).map((l) => l.letra).filter((t) => t && t.trim()), [song.corpo]);
  return (
    <div className="pb-10">
      <button onClick={onBack} className="flex items-center gap-1 text-indigo-700 text-sm font-medium mb-4 hover:underline"><ChevronLeft size={16} /> Voltar</button>
      <h1 className="font-serif text-3xl text-slate-900 leading-tight">{song.titulo}</h1>
      <p className="text-slate-500 mb-5">{song.artista || "—"}</p>
      <div className="flex items-center justify-between bg-indigo-950 rounded-2xl px-4 py-3 mb-5">
        <div><p className="text-indigo-300 text-xs uppercase tracking-wide">Tom</p><p className="text-white font-mono text-2xl font-bold">{tomAtual}</p></div>
        <div className="flex items-center gap-2">
          {steps !== 0 && <button onClick={() => setSteps(0)} className="p-2 text-indigo-300 hover:text-white"><RotateCcw size={18} /></button>}
          <button onClick={() => setSteps((s) => s - 1)} className="w-10 h-10 rounded-full bg-indigo-800 text-white flex items-center justify-center hover:bg-indigo-700"><Minus size={18} /></button>
          <span className="text-indigo-200 text-sm w-10 text-center font-mono">{steps > 0 ? "+" + steps : steps}</span>
          <button onClick={() => setSteps((s) => s + 1)} className="w-10 h-10 rounded-full bg-amber-500 text-indigo-950 flex items-center justify-center hover:bg-amber-400"><Plus size={18} /></button>
        </div>
      </div>
      <div className="flex gap-1 mb-5 bg-stone-100 p-1 rounded-xl w-fit">
        {["cifra", "letra", "video"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={"px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition " + (tab === t ? "bg-white text-indigo-950 shadow-sm" : "text-slate-500")}>{t === "video" ? "Vídeo" : t}</button>
        ))}
      </div>
      {tab === "cifra" && <div className="bg-white rounded-2xl border border-stone-200 p-5"><CifraRender corpo={song.corpo} steps={steps} useFlat={useFlat} /></div>}
      {tab === "letra" && <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-2 text-lg text-slate-800 leading-relaxed">{letras.map((l, i) => <p key={i}>{l}</p>)}</div>}
      {tab === "video" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="aspect-video bg-indigo-950 rounded-xl flex flex-col items-center justify-center text-indigo-300"><Play size={40} className="text-amber-500 mb-2" /><p className="text-sm">Vídeo de referência</p></div>
          <div className="flex items-center gap-2 mt-3 text-sm text-slate-500"><Link2 size={15} /> <span className="font-mono break-all">{song.youtube || "—"}</span></div>
        </div>
      )}
    </div>
  );
}

/* ===================== ADD SONG ===================== */
function AddSong({ perfil, onCancel, onSaved }) {
  const [titulo, setTitulo] = useState(""); const [artista, setArtista] = useState(""); const [tom, setTom] = useState("C");
  const [youtube, setYoutube] = useState(""); const [corpo, setCorpo] = useState(""); const [preview, setPreview] = useState(false);
  const [erro, setErro] = useState(""); const [salvando, setSalvando] = useState(false);
  const podeSalvar = titulo.trim() && corpo.trim();
  const inputCls = "w-full px-3 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400";

  async function salvar() {
    setErro(""); setSalvando(true);
    const { error } = await supabase.from("louvores").insert({
      grupo_id: perfil.grupo_id, titulo, artista, tom, youtube, corpo, criado_por: perfil.id,
    });
    setSalvando(false);
    if (error) { setErro(error.message); return; }
    onSaved();
  }

  return (
    <div className="pb-10">
      <button onClick={onCancel} className="flex items-center gap-1 text-indigo-700 text-sm font-medium mb-4 hover:underline"><ChevronLeft size={16} /> Cancelar</button>
      <h1 className="font-serif text-3xl text-slate-900 mb-5">Novo louvor</h1>
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
          <button onClick={salvar} disabled={!podeSalvar || salvando} className="flex-1 bg-indigo-950 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-40 hover:bg-indigo-900">{salvando ? "Salvando..." : "Salvar louvor"}</button>
        </div>
        {preview && corpo.trim() && (<div><p className="text-sm text-slate-500 mb-2">Como vai ficar (tom {tom}):</p><div className="bg-white rounded-2xl border border-stone-200 p-5"><CifraRender corpo={corpo} steps={0} useFlat={FLAT_KEYS.has((tom || "").replace(/m$/, ""))} /></div></div>)}
      </div>
    </div>
  );
}

/* ===================== REPERTÓRIO ===================== */
function Repertorio({ perfil }) {
  const [louvores, setLouvores] = useState([]);
  const [q, setQ] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState(null);
  const [adicionando, setAdicionando] = useState(false);
  const podeAdd = perfil && (perfil.papel === "admin" || perfil.papel === "lider");

  async function carregar() {
    const { data } = await supabase.from("louvores").select("*").order("created_at", { ascending: false });
    setLouvores(data || []);
    setCarregando(false);
  }
  useEffect(() => {
    carregar();
    const ch = supabase.channel("louvores-rt").on("postgres_changes", { event: "*", schema: "public", table: "louvores" }, carregar).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (adicionando) return <AddSong perfil={perfil} onCancel={() => setAdicionando(false)} onSaved={() => setAdicionando(false)} />;
  if (aberto) return <SongView song={aberto} onBack={() => setAberto(null)} />;

  const list = louvores.filter((s) => (s.titulo || "").toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="pb-10">
      <div className="flex items-start justify-between mb-1">
        <div><h1 className="font-serif text-3xl text-slate-900">Repertório</h1><p className="text-slate-500">{louvores.length} louvores no grupo</p></div>
        {podeAdd && <button onClick={() => setAdicionando(true)} className="flex items-center gap-1.5 bg-amber-500 text-indigo-950 text-sm font-medium px-3 py-2 rounded-xl hover:bg-amber-400"><Plus size={16} /> Novo</button>}
      </div>
      <div className="relative my-5"><Search size={18} className="absolute left-3 top-3 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar louvor..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" /></div>
      {carregando ? (
        <p className="text-slate-400 text-center py-10">Carregando...</p>
      ) : list.length === 0 ? (
        <div className="text-center py-12 text-slate-400"><Music size={32} className="mx-auto mb-2 opacity-40" /><p>Nenhum louvor ainda.{podeAdd && " Toque em \u201cNovo\u201d para cadastrar o primeiro."}</p></div>
      ) : (
        <div className="space-y-2">{list.map((s) => (
          <button key={s.id} onClick={() => setAberto(s)} className="w-full flex items-center justify-between bg-white rounded-xl border border-stone-200 p-4 hover:border-amber-400 transition text-left">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center"><Music size={18} className="text-indigo-700" /></div><div><p className="font-medium text-slate-900">{s.titulo}</p><p className="text-sm text-slate-400">{s.artista || "—"}</p></div></div>
            <span className="font-mono text-amber-600 font-bold">{s.tom || "—"}</span>
          </button>
        ))}</div>
      )}
    </div>
  );
}

/* ===================== APP ===================== */
export default function App() {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);

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
    })();
    return () => { ativo = false; };
  }, [session]);

  if (carregando) return <div className="min-h-screen bg-indigo-950 flex items-center justify-center text-indigo-300">Carregando...</div>;
  if (!session) return <Login />;

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800">
      <header className="bg-indigo-950 text-white sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center"><Music size={16} className="text-indigo-950" /></div><span className="font-serif text-lg">Filadélfia Louvor</span></div>
          <div className="flex items-center gap-3 text-sm text-indigo-200">
            <span className="flex items-center gap-1">{perfil?.nome || session.user.email}{perfil?.papel === "admin" && <Crown size={13} className="text-amber-500" />}{perfil?.papel === "lider" && <Star size={12} className="text-indigo-300" />}</span>
            <button onClick={() => supabase.auth.signOut()} className="hover:text-white" title="Sair"><LogOut size={18} /></button>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-5 py-6">
        {perfil ? <Repertorio perfil={perfil} /> : <p className="text-slate-400 text-center py-10">Carregando seu perfil...</p>}
      </main>
    </div>
  );
}
