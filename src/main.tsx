import React from 'react';
import ReactDOM from 'react-dom/client';
import '@carbon/react/scss/reset.scss';
import './styles.scss';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);