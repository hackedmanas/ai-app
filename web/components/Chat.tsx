import { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { db } from '../firebaseConfig';
import {
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatProps {
  user: User;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    // Add user message to state
    const newMessages = [...messages, { role: 'user', content: input.trim() }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    // Call AI
    const reply = await callAI(model, newMessages);
    const updatedMessages = [...newMessages, { role: 'assistant', content: reply }];
    setMessages(updatedMessages);
    setLoading(false);
    // Save conversation to Firestore
    try {
      const convoRef = collection(
        db,
        'users',
        user.uid,
        'conversations'
      );
      await addDoc(convoRef, {
        messages: updatedMessages,
        model,
        createdAt: serverTimestamp(),
      });
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
    <div>
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
  );
}