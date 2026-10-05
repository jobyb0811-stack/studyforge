import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { seedIfEmpty } from './db/storage';
const root = createRoot(document.getElementById('root')!);
if (location.pathname.startsWith('/alarm/')) root.render(<App />); // alarm screen must open instantly
else seedIfEmpty().finally(() => root.render(<App />));
