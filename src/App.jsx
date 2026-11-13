import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import EmojiPicker from "emoji-picker-react";

export const SERVER = "http://localhost:8080";
const WS_URL = "ws://localhost:8080/ws";

async function subir(archivo) {
  const datos = new FormData();
  datos.append("archivo", archivo);
  const r = await fetch(SERVER + "/api/archivos", { method: "POST", body: datos });
  return (await r.json()).url;
}

export default function App() {
  const [usuario, setUsuario] = useState("");
  const [conectado, setConectado] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [verEmojis, setVerEmojis] = useState(false);
  const clientRef = useRef(null);
  const finRef = useRef(null);

  function conectar(e) {
    e.preventDefault();
    if (!usuario.trim()) return;
    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 3000,
      onConnect: () => {
        setConectado(true);
        client.subscribe("/topic/sala", (frame) =>
          setMensajes((prev) => [...prev, JSON.parse(frame.body)]));
        client.publish({ destination: "/app/chat.unirse",
          body: JSON.stringify({ tipo: "UNION", autor: usuario }) });
      },
      onWebSocketClose: () => setConectado(false),
    });
    client.activate();
    clientRef.current = client;
  }

  function enviar(tipo, contenido) {
    clientRef.current?.publish({ destination: "/app/chat.enviar",
      body: JSON.stringify({ tipo, autor: usuario, contenido }) });
  }

  function enviarTexto(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    enviar("TEXTO", texto.trim());
    setTexto("");
    setVerEmojis(false);
  }

  useEffect(() => () => clientRef.current?.deactivate(), []);
  useEffect(() => { finRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensajes]);

  if (!conectado) {
    return (
      <form onSubmit={conectar} className="login">
        <div className="balon">⚽</div>
        <h1>La Barra del Clásico</h1>
        <p>Entra a la tribuna y comenta el partido en vivo</p>
        <input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Tu nombre de hincha" />
        <button>Entrar a la tribuna</button>
      </form>
    );
  }

  return (
    <main className="chat">
      <header className="marcador">
        <span>Millonarios</span>
        <b>2 - 1</b>
        <span>Santa Fe</span>
        <small>⏱️ En vivo · Clásico capitalino</small>
      </header>
      <ul className="mensajes">
        {mensajes.map((m, i) => (
          <li key={i} className={m.tipo === "UNION" || m.tipo === "SALIDA" ? "sistema"
                                 : m.autor === usuario ? "mio" : "otro"}>
            {m.tipo === "TEXTO" && <><b>{m.autor}</b> {m.contenido}</>}
            {m.tipo === "IMAGEN" && <><b>{m.autor}</b><img src={SERVER + m.contenido} alt="" /></>}
            {m.tipo === "UNION" && <>📣 {m.contenido} a la tribuna</>}
            {m.tipo === "SALIDA" && <>🚪 {m.contenido}</>}
            <small>{m.fecha}</small>
          </li>
        ))}
        <li ref={finRef} />
      </ul>
      {verEmojis && (
        <div className="emojis">
          <EmojiPicker onEmojiClick={(e) => setTexto((t) => t + e.emoji)} />
        </div>
      )}
      <form onSubmit={enviarTexto} className="barra">
        <button type="button" onClick={() => setVerEmojis(!verEmojis)}>😄</button>
        <label className="foto">
          📷
          <input type="file" accept="image/*" hidden onChange={async (e) => {
            const archivo = e.target.files[0];
            if (archivo) enviar("IMAGEN", await subir(archivo));
            e.target.value = "";
          }} />
        </label>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="¡Grita el gol!" />
        <button>Enviar</button>
      </form>
    </main>
  );
}
