# AI Chat Application (Web & Mobile)

This repository contains a **server‑less** AI chat application that runs both on the web (via Next.js) and as a mobile app (via Expo/React Native).  The app leverages **Firebase** for authentication and conversation storage and can talk to multiple AI models, including OpenAI’s ChatGPT, Anthropic’s Claude, and DeepSeek.  All model calls are made directly from the client; there is **no dedicated backend server**.  Deploy the web client to Vercel (or any static hosting) and the mobile app through Expo.

## Features

- **Multi‑model support** – choose between ChatGPT, Claude and DeepSeek from a simple drop‑down.  Models share a common chat history so you can compare their responses.
- **Firebase authentication** – sign in with Google or email/password; conversations are stored per user in Firestore under `users/{uid}/conversations`.
- **Real‑time chat UI** – messages appear instantly, and the assistant’s responses stream in as they arrive.
- **Fully client‑side** – all API calls are made directly from the browser or mobile client; no custom backend is required.

## Repository structure

```text
ai-app/
├─ web/        # Next.js web client
│  ├─ pages/
│  │  ├─ _app.tsx
│  │  └─ index.tsx
│  ├─ components/
│  │  └─ Chat.tsx
│  ├─ firebaseConfig.ts
│  ├─ package.json
│  ├─ next.config.js
│  └─ styles/
│     └─ globals.css
└─ mobile/     # Expo/React Native mobile client
   ├─ App.tsx
   ├─ components/
   │  └─ Chat.tsx
   ├─ firebaseConfig.ts
   ├─ app.json
   └─ package.json
```

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/&lt;your‑username&gt;/ai-app.git
cd ai-app
```

### 2. Configure Firebase

Create a new project in [Firebase Console](https://console.firebase.google.com/).  Enable **Authentication** (Google sign‑in or email/password) and **Cloud Firestore**.  Then copy your project’s configuration and add the following environment variables:

For the **web** client, create a `.env.local` file inside `web/`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=yourFirebaseApiKey
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=yourFirebaseAuthDomain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=yourFirebaseProjectId
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=yourFirebaseStorageBucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=yourFirebaseSenderId
NEXT_PUBLIC_FIREBASE_APP_ID=yourFirebaseAppId

NEXT_PUBLIC_OPENAI_API_KEY=yourOpenAIKey
NEXT_PUBLIC_ANTHROPIC_API_KEY=yourAnthropicKey
NEXT_PUBLIC_DEEPSEEK_API_KEY=yourDeepSeekKey
```

For the **mobile** client, create a `.env` file inside `mobile/` with the same keys (Expo’s `expo-constants` automatically exposes variables prefixed with `EXPO_PUBLIC_`):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=yourFirebaseApiKey
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=yourFirebaseAuthDomain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=yourFirebaseProjectId
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=yourFirebaseStorageBucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=yourFirebaseSenderId
EXPO_PUBLIC_FIREBASE_APP_ID=yourFirebaseAppId

EXPO_PUBLIC_OPENAI_API_KEY=yourOpenAIKey
EXPO_PUBLIC_ANTHROPIC_API_KEY=yourAnthropicKey
EXPO_PUBLIC_DEEPSEEK_API_KEY=yourDeepSeekKey
```

> **Security note:** Because there is no dedicated backend, the AI API keys are exposed to the client.  Restrict these keys to your own domain and usage quota in the respective provider dashboards.  For production use, consider proxying the requests through a secure server to hide the keys.

### 3. Install dependencies

Each client has its own `package.json`.  Install dependencies separately:

```bash
# Web client
cd web
npm install

# Mobile client
cd ../mobile
npm install
```

### 4. Run the web client locally

```bash
cd web
npm run dev
```

Open <http://localhost:3000> to see the app.  You can now sign in and chat with the AI models.

### 5. Run the mobile app locally

```bash
cd mobile
npx expo start
```

Follow the Expo CLI instructions to launch on Android, iOS, or the web.

### 6. Deployment

- **Web** – Deploy to Vercel by linking the `web/` directory.  Set the same environment variables (`NEXT_PUBLIC_…`) in Vercel’s project settings.
- **Mobile** – Use Expo EAS (Expo Application Services) to build and submit your app to the App Store or Google Play.  See the [Expo docs](https://docs.expo.dev/submit/introduction/) for details.

## Usage

1. Sign in with Google or create an account via email/password.
2. Choose a model from the drop‑down (ChatGPT, Claude or DeepSeek).
3. Type a prompt and send it.  The assistant’s response will appear below your message.  Conversations are saved automatically to Firestore.

## Customisation

- Adjust the model names or endpoints in `web/components/Chat.tsx` and `mobile/components/Chat.tsx` to add more providers.
- Use your own UI styling by editing the CSS in `web/styles/globals.css` or the React Native styles in the mobile components.

## Limitations

- **API keys are exposed** – Without a backend, your API keys live in the client.  Restrict them carefully.
- **Cost management** – Each chat request consumes tokens on your AI providers.  Monitor usage to avoid unexpected charges.
- **Performance** – Mobile network conditions may impact response times because calls are made directly from the client.

## Contributing

Contributions and improvements are welcome!  Feel free to fork the repo, add features or fix bugs, and open a pull request.
