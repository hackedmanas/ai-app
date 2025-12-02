import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { User } from 'firebase/auth';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatProps {
  user: User;
}

async function callAI(model: string, messages: Message[]): Promise<string> {
  const openAIApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  const anthropicApiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  const deepseekApiKey = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;
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
  } catch (err) {
    console.error(err);
    return 'Error calling AI';
  }
}

export default function Chat({ user }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('chatgpt');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    // Scroll to bottom when messages update
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: 'user', content: input.trim() }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    const reply = await callAI(model, newMessages);
    const updatedMessages = [...newMessages, { role: 'assistant', content: reply }];
    setMessages(updatedMessages);
    setLoading(false);
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.messages} ref={scrollViewRef}>
        {messages.map((msg, idx) => (
          <View
            key={idx}
            style={[
              styles.message,
              msg.role === 'user' ? styles.userMsg : styles.aiMsg,
            ]}
          >
            <Text style={styles.messageAuthor}>
              {msg.role === 'user' ? 'You' : 'AI'}:
            </Text>
            <Text style={styles.messageText}>{msg.content}</Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.message, styles.aiMsg]}>
            <Text style={styles.messageAuthor}>AI:</Text>
            <ActivityIndicator size="small" color="#555" />
          </View>
        )}
      </ScrollView>
      <View style={styles.inputRow}>
        <Picker
          selectedValue={model}
          style={styles.picker}
          onValueChange={(itemValue) => setModel(itemValue)}
        >
          <Picker.Item label="ChatGPT" value="chatgpt" />
          <Picker.Item label="Claude" value="claude" />
          <Picker.Item label="DeepSeek" value="deepseek" />
        </Picker>
        <TextInput
          style={styles.textInput}
          placeholder="Type your message…"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => !loading && sendMessage()}
          blurOnSubmit={false}
        />
        <Button title="Send" onPress={sendMessage} disabled={loading || !input.trim()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  messages: {
    flex: 1,
    marginBottom: 10,
  },
  message: {
    marginVertical: 5,
    padding: 8,
    borderRadius: 6,
    maxWidth: '90%',
  },
  userMsg: {
    backgroundColor: '#d0e7ff',
    alignSelf: 'flex-end',
  },
  aiMsg: {
    backgroundColor: '#ffe7e7',
    alignSelf: 'flex-start',
  },
  messageAuthor: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  picker: {
    flex: 1,
    height: 40,
  },
  textInput: {
    flex: 3,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
    marginHorizontal: 4,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
  },
});