import type { AppProps } from 'next/app';
import '../styles/globals.css';

// Firebase must be initialized once; the config is imported
import '../firebaseConfig';

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}