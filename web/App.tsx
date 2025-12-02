import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TextInput, Button } from 'react-native';
import { auth } from './firebaseConfig';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import Chat from './components/Chat';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  const handleAuth = async () => {
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
      setEmail('');
      setPassword('');
      setError('');
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (!user) {
    return (
      <View style={styles.loginContainer}>
        <StatusBar style="auto" />
        <Text style={styles.title}>AI Chat</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title={mode === 'login' ? 'Sign In' : 'Sign Up'}
          onPress={handleAuth}
          disabled={!email || !password}
        />
        <Button
          title={mode === 'login' ? 'Need an account? Sign Up' : 'Have an account? Sign In'}
          onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.signedInText}>Signed in as {user.email}</Text>
      <Chat user={user} />
      <Button title="Sign Out" color="#e50000" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  loginContainer: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  signedInText: {
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 10,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
  },
  error: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
});