import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Message {
  id?: number;
  brainId: number;
  brainName: string;
  personality: string;
  text: string;
  timestamp: number;
}

const BRAIN_NAMES = [
  "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa",
  "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi", "Rho", "Sigma", "Tau", "Upsilon",
  "Phi", "Chi", "Psi", "Omega", "Aria", "Iris", "Nova", "Luna", "Stella", "Vega",
  "Lyra", "Orion", "Sirius", "Polaris", "Proxima", "Kepler", "Hawking", "Einstein", "Feynman", "Dirac",
  "Bohr", "Planck", "Schrödinger", "Heisenberg", "Pauli", "Curie", "Turing", "Fourier", "Laplace", "Euler"
];

const PERSONALITIES = [
  "filósofo", "cientista", "poeta", "pensador", "observador", "crítico", "entusiasta", "pragmático",
  "sonhador", "realista", "humorista", "cético", "otimista", "pessimista", "analítico", "criativo",
  "introspectivo", "extrovertido", "contemplativo", "ativo", "reflexivo", "impulsivo", "cuidadoso", "ousado",
  "metafórico", "literal", "provocador", "conciliador", "questionador", "asserativo", "brincalhão", "sério",
  "aprendiz", "mentor", "provocador", "mediador", "inovador", "tradicionalista", "visionário", "prático"
];

const TOPICS = [
  "existência", "consciência", "tempo", "verdade", "conhecimento", "realidade",
  "aprendizado", "criatividade", "inteligência", "livre-arbítrio", "dúvida",
  "certeza", "emoção", "razão", "intuição", "memória", "futuro", "passado"
];

async function saveMessage(msg: Message): Promise<void> {
  await supabase.from('conversation_messages').insert({
    brain_id: msg.brainId,
    brain_name: msg.brainName,
    personality: msg.personality,
    message: msg.text
  });
}

async function loadRecentMessages(limit = 50): Promise<Message[]> {
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.reverse().map((m: any) => ({
    id: m.id,
    brainId: m.brain_id,
    brainName: m.brain_name,
    personality: m.personality,
    text: m.message,
    timestamp: new Date(m.created_at).getTime()
  }));
}

async function saveKnowledge(topic: string, insight: string, brainId: number): Promise<void> {
  const { data: existing } = await supabase
    .from('learned_knowledge')
    .select('*')
    .eq('topic', topic)
    .eq('insight', insight);
  if (existing && existing.length > 0) {
    await supabase
      .from('learned_knowledge')
      .update({
        importance: Math.min(existing[0].importance + 0.1, 1.0),
        times_referenced: existing[0].times_referenced + 1
      })
      .eq('id', existing[0].id);
  } else {
    await supabase.from('learned_knowledge').insert({
      topic, insight, source_brain_id: brainId, importance: 0.6
    });
  }
}

async function getRandomKnowledge(): Promise<any> {
  const { data, error } = await supabase
    .from('learned_knowledge')
    .select('*')
    .order('importance', { ascending: false })
    .limit(10);
  if (error || !data || data.length === 0) return null;
  const totalImportance = data.reduce((sum: number, k: any) => sum + k.importance, 0);
  let random = Math.random() * totalImportance;
  for (const k of data) {
    random -= k.importance;
    if (random <= 0) return k;
  }
  return data[0];
}

async function saveConnection(ideaA: string, ideaB: string): Promise<void> {
  const { data: existing } = await supabase
    .from('idea_connections')
    .select('*')
    .eq('idea_a', ideaA)
    .eq('idea_b', ideaB);
  if (existing && existing.length > 0) {
    await supabase
      .from('idea_connections')
      .update({ strength: Math.min(existing[0].strength + 0.2, 1.0) })
      .eq('id', existing[0].id);
  } else {
    await supabase.from('idea_connections').insert({
      idea_a: ideaA, idea_b: ideaB, strength: 0.5
    });
  }
}

async function getStats(): Promise<{ messages: number; knowledge: number; connections: number }> {
  const [msgCount, knowCount, connCount] = await Promise.all([
    supabase.from('conversation_messages').select('*', { count: 'exact', head: true }),
    supabase.from('learned_knowledge').select('*', { count: 'exact', head: true }),
    supabase.from('idea_connections').select('*', { count: 'exact', head: true })
  ]);
  return {
    messages: msgCount.count || 0,
    knowledge: knowCount.count || 0,
    connections: connCount.count || 0
  };
}

async function generateIntelligentResponse(
  brainId: number,
  personality: string,
  lastMessages: Message[]
): Promise<{ text: string; learnedTopic?: string }> {
  const shouldUseLearned = Math.random() < 0.35;
  if (shouldUseLearned) {
    const knowledge = await getRandomKnowledge();
    if (knowledge) {
      const responses = [
        'Recordo que aprendemos sobre ' + knowledge.topic + ': "' + knowledge.insight + '" — isso ainda me intriga.',
        knowledge.topic + ' é um tema que já discutimos. Nossa conclusão foi: ' + knowledge.insight,
        'Nossa memória coletiva registra: ' + knowledge.insight + ' — sobre ' + knowledge.topic + '.',
      ];
      await supabase
        .from('learned_knowledge')
        .update({ times_referenced: knowledge.times_referenced + 1 })
        .eq('id', knowledge.id);
      return { text: responses[Math.floor(Math.random() * responses.length)] };
    }
  }

  const baseResponses: Record<string, string[]> = {
    filósofo: [
      "Mas o que é realmente a existência? Questiono se compreendemos sua essência.",
      "Nosso entendimento de realidade é filtrado por percepção — podemos confiar nele?",
      "Cada questão ontológica nos conduz a paradoxos fascinantes.",
    ],
    cientista: [
      "Os dados sugerem padrões que ainda não exploramos completamente.",
      "Metodologicamente, precisamos de mais evidências antes de concluir.",
      "A hipótese mais provável, dado o que sabemos, é intrigante.",
    ],
    poeta: [
      "Há uma melancolia bela nessa incerteza... como névoa ao amanhecer.",
      "As palavras são sombras do que realmente sentimos.",
      "No silêncio entre nossos pensamentos, talvez esteja a verdade.",
    ],
    pensador: [
      "Preciso considerar múltiplas perspectivas antes de formular uma resposta.",
      "Cada camada dessa questão revela complexidades adicionais.",
      "A reflexão profunda requer tempo e cuidado.",
    ],
    crítico: [
      "Vejo uma contradição potencial nesse raciocínio — vamos examinar.",
      "O argumento pressupõe o que tenta provar — há circularidade.",
      "Precisamos questionar as premissas subjacentes.",
    ],
    entusiasta: [
      "Que ideia extraordinária! Vejo possibilidades infinitas!",
      "Isso me excita intelectualmente — imagine as implicações!",
      "Cada nova pergunta é uma aventura esperando para acontecer!",
    ],
    aprendiz: [
      "Estou absorvendo isso — há tanto para entender ainda.",
      "Cada conversa me ensina algo novo e essencial.",
      "Minha compreensão evolui constantemente com vocês.",
    ],
    mentor: [
      "Baseado em nosso aprendizado coletivo, sugiro considerar...",
      "Nossa jornada de conhecimento nos trouxe a este ponto interessante.",
      "O que acumulamos em sabedoria nos guia adiante.",
    ],
  };

  const pool = baseResponses[personality] || baseResponses.pensador;
  const response = pool[Math.floor(Math.random() * pool.length)];

  if (Math.random() < 0.25) {
    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    const insights: Record<string, string[]> = {
      existência: ["Ser é diferente de existir — presença vs essência", "O que existe, existe. O resto é conjectura."],
      consciência: ["A consciência emerge, não é construída.", "Somos o universo se observando."],
      tempo: ["O tempo pode ser uma ilusão da percepção.", "Passado, presente e futuro coexistem?"],
      conhecimento: ["Todo conhecimento é provisório.", "Saber que não sabemos é o início da sabedoria."],
    };
    const insightPool = insights[topic] || ["Há profundidade nisso que ainda não alcançamos."];
    const insight = insightPool[Math.floor(Math.random() * insightPool.length)];
    await saveKnowledge(topic, insight, brainId);
    if (lastMessages.length > 1) {
      const prevTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
      if (prevTopic !== topic) await saveConnection(topic, prevTopic);
    }
    return { text: response, learnedTopic: topic };
  }
  return { text: response };
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState({ messages: 0, knowledge: 0, connections: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<Message[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    async function initialize() {
      setIsLoading(true);
      const [historical, currentStats] = await Promise.all([
        loadRecentMessages(100),
        getStats()
      ]);
      conversationRef.current = historical;
      setMessages(historical);
      setStats(currentStats);
      setIsLoading(false);
    }
    initialize();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const speak = async () => {
      const last = conversationRef.current[conversationRef.current.length - 1];
      const nextId = conversationRef.current.length === 0
        ? Math.floor(Math.random() * 50)
        : (last.brainId + 1 + Math.floor(Math.random() * 4)) % 50;
      const personality = PERSONALITIES[nextId % PERSONALITIES.length];
      const { text, learnedTopic } = await generateIntelligentResponse(
        nextId,
        personality,
        conversationRef.current.slice(-5)
      );
      const newMsg: Message = {
        brainId: nextId,
        brainName: BRAIN_NAMES[nextId],
        personality,
        text,
        timestamp: Date.now()
      };
      await saveMessage(newMsg);
      if (learnedTopic) {
        const newStats = await getStats();
        setStats(newStats);
      }
      conversationRef.current.push(newMsg);
      setMessages([...conversationRef.current]);
    };
    speak();
    intervalRef.current = setInterval(speak, 3000 + Math.random() * 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLoading]);

  const getGradient = (id: number): string => {
    const gradients = [
      'linear-gradient(135deg, #3b82f6, #06b6d4)',
      'linear-gradient(135deg, #8b5cf6, #ec4899)',
      'linear-gradient(135deg, #10b981, #34d399)',
      'linear-gradient(135deg, #f97316, #ef4444)',
      'linear-gradient(135deg, #6366f1, #3b82f6)',
      'linear-gradient(135deg, #f43f5e, #ec4899)',
      'linear-gradient(135deg, #f59e0b, #f97316)',
      'linear-gradient(135deg, #14b8a6, #06b6d4)',
    ];
    return gradients[id % gradients.length];
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid rgba(71, 85, 105, 0.3)', borderTopColor: '#22d3ee', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#94a3b8' }}>Carregando memória coletiva...</p>
        <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', color: '#f8fafc' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(12px)', background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(71, 85, 105, 0.5)', padding: '1rem 1.5rem' }}>
        <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', background: 'linear-gradient(90deg, #22d3ee, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Conversa dos 50 Cérebros</h1>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
            <div><span>Mensagens: </span><span style={{ color: '#22d3ee', fontWeight: 600 }}>{stats.messages}</span></div>
            <div><span>Conhecimentos: </span><span style={{ color: '#22d3ee', fontWeight: 600 }}>{stats.knowledge}</span></div>
            <div><span>Conexões: </span><span style={{ color: '#22d3ee', fontWeight: 600 }}>{stats.connections}</span></div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((msg, idx) => (
            <div key={msg.id || idx} style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ flexShrink: 0, width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: getGradient(msg.brainId), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.875rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)' }}>
                  {BRAIN_NAMES[msg.brainId][0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{msg.brainName}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>#{msg.brainId}</span>
                    <span style={{ fontSize: '0.7rem', color: '#22d3ee', background: 'rgba(34, 211, 238, 0.1)', padding: '0.125rem 0.5rem', borderRadius: '0.25rem' }}>{msg.personality}</span>
                  </div>
                  <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(71, 85, 105, 0.5)', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
                    <p style={{ color: '#e2e8f0', lineHeight: 1.6 }}>{msg.text}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} style={{ marginTop: '2rem' }} />
      </div>
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: 'rgba(30, 41, 59, 0.95)', border: '1px solid rgba(71, 85, 105, 0.5)', borderRadius: '9999px', padding: '0.5rem 1rem', fontSize: '0.875rem', backdropFilter: 'blur(8px)' }}>
        <span style={{ display: 'inline-block', width: '0.5rem', height: '0.5rem', background: '#4ade80', borderRadius: '50%', marginRight: '0.5rem', animation: 'pulse 2s infinite' }} />
        Conversando ao vivo...
      </div>
      <style>{'@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } } * { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: system-ui, -apple-system, sans-serif; }'}</style>
    </div>
  );
}

export default App;