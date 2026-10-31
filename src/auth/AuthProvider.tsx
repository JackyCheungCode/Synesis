import { createContext, useContext, useEffect, useMemo, useState, type ReactNode, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Button, TextInput } from '../components/ui';
import { supabase } from '../lib/supabase';

type AuthContextValue = { session: Session | null; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.error('Unable to restore Supabase session:', error.message);
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    signOut: async () => { await supabase.auth.signOut(); },
  }), [session]);

  if (loading) return <div className="auth-loading" role="status" aria-live="polite">正在安全载入 Synesis…</div>;
  return <AuthContext.Provider value={value}>{session ? children : <AuthScreen />}</AuthContext.Provider>;
}

function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (!data.session) setMessage({ kind: 'success', text: '注册申请已提交。请检查邮箱并完成验证，然后返回此处登录。' });
      }
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '身份验证失败，请稍后重试。' });
    } finally {
      setBusy(false);
    }
  }

  const isSignIn = mode === 'signin';
  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="auth-title">
        <a className="auth-brand" href="#/dashboard" aria-label="Synesis 首页">
          <span className="auth-brand-name">SYNESIS</span>
          <span className="auth-brand-divider" aria-hidden="true" />
          <span className="auth-brand-description">GLOBAL TRADE INTELLIGENCE</span>
        </a>

        <div className="auth-heading">
          <p className="auth-eyebrow">SECURE WORKSPACE</p>
          <h1 id="auth-title">{isSignIn ? '欢迎回来' : '创建 Synesis 账户'}</h1>
          <p className="auth-description">
            {isSignIn ? '登录以访问你的全球外贸情报工作空间。' : '注册个人账户，开始建立你的市场研究项目。'}
          </p>
        </div>

        {message && (
          <div className={`auth-feedback auth-feedback--${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'} aria-live="polite">
            <strong>{message.kind === 'error' ? '身份验证未完成' : '请检查邮箱'}</strong>
            <p>{message.text}</p>
          </div>
        )}

        <form onSubmit={submit} className="auth-form">
          <TextInput
            id="auth-email"
            type="email"
            labelText="电子邮箱"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <TextInput
            id="auth-password"
            type="password"
            labelText="密码"
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
            required
            minLength={8}
          />
          <Button type="submit" kind="primary" size="lg" className="auth-submit" disabled={busy || !email.trim() || password.length < 8}>
            {busy ? '请稍候…' : isSignIn ? '登录 Synesis' : '创建账户'}
          </Button>
        </form>

        <div className="auth-switch">
          <span>{isSignIn ? '还没有账户？' : '已经有账户？'}</span>
          <Button
            type="button"
            kind="ghost"
            size="sm"
            onClick={() => {
              setMode(isSignIn ? 'signup' : 'signin');
              setMessage(null);
            }}
          >
            {isSignIn ? '注册账户' : '返回登录'}
          </Button>
        </div>

        <div className="auth-security">
          由 Supabase Auth 提供身份验证。API Provider 密钥不会用于登录，也不会存储在浏览器本地。
        </div>
      </section>

      <aside className="auth-side-copy" aria-label="Synesis 平台介绍">
        <p className="auth-side-kicker">RESEARCH THE WORLD.</p>
        <h2>Turn global signals<br />into business insight.</h2>
        <p className="auth-side-description">跨平台数据 · 统一情报层 · AI 驱动研究</p>
      </aside>
    </main>
  );
}
