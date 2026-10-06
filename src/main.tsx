import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { seedIfEmpty } from './db/storage';
import { applyTheme, cachedUI, useUI } from './state/appSettings';
applyTheme(cachedUI());
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(useUI.getState().ui));
const root = createRoot(document.getElementById('root')!);
if (location.pathname.startsWith('/alarm/')) root.render(<App />); // alarm screen must open instantly
else seedIfEmpty().finally(() => root.render(<App />));
