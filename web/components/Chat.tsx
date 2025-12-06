import { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { db } from '../firebaseConfig';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  query,
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatProps {
  user: User;
}

interface Conversation {
  id: string;
  messages: Message[];
  model: string;
  createdAt?: Timestamp | null;
}

// Helper to call different AI providers based on the selected model
async function callAI(
  model: string,
  messages: Message[]
): Promise<string> {
  const openAIApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  const anthropicApiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
  const deepseekApiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;
  try {
    switch (model) {
      case 'chatgpt': {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAIApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });
        const data = await res.json();
        return (
          data?.choices?.[0]?.message?.content?.trim() ||
          data?.choices?.[0]?.text?.trim() ||
          'No response'
        );
      }
      case 'claude': {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey || '',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            max_tokens: 1024,
            temperature: 0.7,
          }),
        });
        const data = await res.json();
        // Claude returns content as an array of parts; fallback to generic shape
        const content = data?.content;
        if (Array.isArray(content) && content.length > 0 && content[0].text) {
          return content[0].text.trim();
        }
        if (data?.message?.content) {
          return data.message.content.trim();
        }
        return 'No response';
      }
      case 'deepseek': {
        const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${deepseekApiKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });
        const data = await res.json();
        return (
          data?.choices?.[0]?.message?.content?.trim() || 'No response'
        );
      }
      default:
        return 'Unknown model';
    }
  } catch (err: any) {
    console.error(err);
    return 'Error calling AI';
  }
}

export default function Chat({ user }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('chatgpt');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null
  );
  const [historyError, setHistoryError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load recent conversations for the user
  useEffect(() => {
    const conversationsRef = collection(
      db,
      'users',
      user.uid,
      'conversations'
    );
    const q = query(conversationsRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const history = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<Conversation>;
          return {
            id: docSnap.id,
            messages: data.messages || [],
            model: data.model || 'chatgpt',
            createdAt: data.createdAt || null,
          };
        });
        setConversations(history);
        setHistoryError(null);
      },
      (err) => {
        console.error('Error loading conversations', err);
        setHistoryError('Could not load previous conversations.');
      }
    );

    return unsubscribe;
  }, [user.uid]);

  const formatDate = (timestamp?: Timestamp | null) => {
    if (!timestamp?.toDate) return 'Unknown date';
    return timestamp.toDate().toLocaleString();
  };

  const startNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setModel('chatgpt');
  };

  const loadConversation = (conversation: Conversation) => {
    setActiveConversationId(conversation.id);
    setMessages(conversation.messages || []);
    setModel(conversation.model || 'chatgpt');
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    // Add user message to state
    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: input.trim() },
    ];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    // Call AI
    const reply = await callAI(model, newMessages);
    const updatedMessages: Message[] = [
      ...newMessages,
      { role: 'assistant', content: reply },
    ];
    setMessages(updatedMessages);
    setLoading(false);
    // Save conversation to Firestore
    try {
      if (activeConversationId) {
        const convoDoc = doc(
          db,
          'users',
          user.uid,
          'conversations',
          activeConversationId
        );
        await setDoc(
          convoDoc,
          {
            messages: updatedMessages,
            model,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        const convoRef = collection(
          db,
          'users',
          user.uid,
          'conversations'
        );
        const docRef = await addDoc(convoRef, {
          messages: updatedMessages,
          model,
          createdAt: serverTimestamp(),
        });
        setActiveConversationId(docRef.id);
      }
    } catch (err) {
      console.error('Error saving conversation', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading) sendMessage();
    }
  };

  return (
    <div className="chat-layout">
      <aside className="history-panel">
        <div className="history-header">
          <h3>Recent conversations</h3>
          <button className="secondary" onClick={startNewConversation}>
            New chat
          </button>
        </div>
        {historyError && <p className="history-error">{historyError}</p>}
        <div className="history-list">
          {conversations.length === 0 && (
            <p className="history-empty">No past conversations yet.</p>
          )}
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              className={`history-item ${
                activeConversationId === conversation.id ? 'active' : ''
              }`}
              onClick={() => loadConversation(conversation)}
            >
              <span className="history-title">{conversation.model}</span>
              <span className="history-date">{formatDate(conversation.createdAt)}</span>
            </button>
          ))}
        </div>
      </aside>
      <div className="chat-pane">
        <div className="chat-box">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong> {msg.content}
            </div>
          ))}
          {loading && <div className="message assistant">AI is typing…</div>}
          <div ref={messagesEndRef} />
        </div>
        <div className="input-area">
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="chatgpt">ChatGPT (OpenAI)</option>
            <option value="claude">Claude (Anthropic)</option>
            <option value="deepseek">DeepSeek</option>
          </select>
          <input
            type="text"
            value={input}
            placeholder="Type your message…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}