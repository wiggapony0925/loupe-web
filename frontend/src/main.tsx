import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from '@/App';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { configureApi } from '@/lib/api';
import { currentIdToken, signOut } from '@/lib/firebase';
import '@/styles/main.scss';

configureApi({
  baseUrl: import.meta.env.VITE_API_URL ?? '',
  getToken: currentIdToken,
  // A 401 means the token is beyond refresh — sign out cleanly rather than
  // letting every request fail one by one.
  onUnauthorized: () => {
    void signOut().catch(() => undefined);
  },
});

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
