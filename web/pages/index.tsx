import { useState } from 'react';
import { auth, provider } from '../firebaseConfig';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signInWithPopup, signOut } from 'firebase/auth';
import Chat from '../components/Chat';

export default function Home() {
  const [user] = useAuthState(auth);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message || 'Error signing in');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (!user) {
    return (
      <div className="login-container">
        <h1>AI Chat</h1>
        <p>Please sign in to continue.</p>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button onClick={handleLogin}>Sign in with Google</button>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>AI Chat</h1>
      <p>Signed in as {user.email}</p>
      <Chat user={user} />
      <button className="logout-button" onClick={handleLogout}>Sign out</button>
    </div>
  );
}