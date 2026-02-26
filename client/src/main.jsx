import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { authApi } from './api/auth';
import './styles/base.css';

function Root() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await authApi.me();
        if (me.authenticated) setUser(me.user);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) return <div className="splash">Loading...</div>;

  return (
    <BrowserRouter>
      <App user={user} setUser={setUser} />
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
