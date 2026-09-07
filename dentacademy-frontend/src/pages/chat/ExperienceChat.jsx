import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  History,
  MessageCircle,
  RefreshCw,
  Send,
  Shield,
  Sparkles,
} from 'lucide-react';
import {
  getConversation,
  listConversations,
  openConversation,
  sendConversationMessage,
} from '../../api/experienceChat';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import AlertBanner from '../../components/ui/AlertBanner';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';

function formatTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 animate-fade-up">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-sm">
        <Bot size={16} />
      </div>
      <div className="rounded-2xl rounded-bl-md bg-surface-raised border border-line px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5" aria-label="Assistant is typing">
          <span className="chat-dot" />
          <span className="chat-dot" style={{ animationDelay: '0.15s' }} />
          <span className="chat-dot" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'USER';
  const meta = message.metadata_json || {};

  return (
    <div
      className={`flex gap-2 animate-fade-up ${isUser ? 'justify-end' : 'items-end'}`}
    >
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-sm">
          <Bot size={16} />
        </div>
      )}
      <div className={`max-w-[min(100%,28rem)] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isUser
              ? 'rounded-2xl rounded-br-md bg-brand text-white'
              : 'rounded-2xl rounded-bl-md bg-surface-raised border border-line text-ink'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className={`flex items-center gap-2 px-1 ${isUser ? 'justify-end' : ''}`}>
          <span className="text-[11px] text-ink-subtle">{formatTime(message.created_at)}</span>
          {!isUser && meta.is_emergency && (
            <Badge text="Flagged" color="red" pulse />
          )}
          {!isUser && meta.requires_escalation && !meta.is_emergency && (
            <Badge text="Review flagged" color="yellow" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExperienceChat() {
  const toast = useToast();
  const [conversation, setConversation] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [retryPayload, setRetryPayload] = useState(null);
  const [emergencyNotice, setEmergencyNotice] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [convRes, histRes] = await Promise.all([
        openConversation('WEB'),
        listConversations().catch(() => ({ data: [] })),
      ]);
      setConversation(convRes.data);
      setHistory(histRes.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not start the assistant. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, sending, scrollToBottom]);

  const loadConversation = async (id) => {
    setError('');
    setShowHistory(false);
    try {
      const res = await getConversation(id);
      setConversation(res.data);
      setEmergencyNotice('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load conversation.');
    }
  };

  const send = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || !conversation || sending) return;

    setSending(true);
    setError('');
    setRetryPayload(null);
    setInput('');

    // Optimistic user bubble
    const optimistic = {
      message_id: `tmp-${Date.now()}`,
      conversation_id: conversation.conversation_id,
      role: 'USER',
      content: text,
      created_at: new Date().toISOString(),
    };
    setConversation((prev) => ({
      ...prev,
      messages: [...(prev?.messages || []), optimistic],
    }));

    try {
      const res = await sendConversationMessage(conversation.conversation_id, text);
      const data = res.data;
      setConversation((prev) => {
        const withoutOptimistic = (prev?.messages || []).filter(
          (m) => m.message_id !== optimistic.message_id
        );
        return {
          ...prev,
          conversation_id: data.conversation_id,
          messages: [...withoutOptimistic, data.user_message, data.assistant_message],
        };
      });
      if (data.emergency_notice) {
        setEmergencyNotice(data.emergency_notice);
        toast.warning('A safety concern was flagged for human review.');
      }
      listConversations()
        .then((r) => setHistory(r.data || []))
        .catch(() => {});
    } catch (err) {
      setConversation((prev) => ({
        ...prev,
        messages: (prev?.messages || []).filter((m) => m.message_id !== optimistic.message_id),
      }));
      setInput(text);
      setRetryPayload(text);
      setError(err.response?.data?.detail || 'Message failed to send. Check your connection and retry.');
      toast.error('Could not send message.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const messages = conversation?.messages || [];

  return (
    <div className="page-shell max-w-4xl mx-auto">
      <PageHeader
        title="AI Experience Assistant"
        subtitle="Privately describe how your apprenticeship day went. This is a reporting and triage tool — not an emergency service."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={History}
              onClick={() => setShowHistory((v) => !v)}
            >
              History
            </Button>
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={bootstrap}>
              New chat
            </Button>
          </div>
        }
      />

      <div className="flex items-start gap-2 text-xs text-ink-muted bg-brand-light/60 dark:bg-emerald-950/30 border border-brand/15 rounded-xl px-3 py-2.5">
        <Shield size={14} className="mt-0.5 text-brand shrink-0" />
        <p>
          Your reports stay within DentAcademy. Mentors are not automatically shown confidential
          complaints about themselves. Serious concerns are escalated to authorized supervisors for
          human review.
        </p>
      </div>

      {emergencyNotice && (
        <AlertBanner type="error" message={emergencyNotice} />
      )}
      {error && (
        <div className="space-y-2">
          <AlertBanner type="error" message={error} />
          {retryPayload && (
            <Button size="sm" variant="outline" onClick={() => send(retryPayload)}>
              Retry last message
            </Button>
          )}
        </div>
      )}

      {showHistory && (
        <div className="card-surface p-4 animate-fade-up">
          <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
            <MessageCircle size={16} className="text-brand" />
            Previous conversations
          </h3>
          {history.length === 0 ? (
            <EmptyState title="No history yet" description="Your past chats will appear here." />
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {history.map((item) => (
                <li key={item.conversation_id}>
                  <button
                    type="button"
                    onClick={() => loadConversation(item.conversation_id)}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors focus-ring ${
                      conversation?.conversation_id === item.conversation_id
                        ? 'border-brand/40 bg-brand-light/50 dark:bg-emerald-950/40'
                        : 'border-line hover:bg-surface-muted'
                    }`}
                  >
                    <div className="flex justify-between gap-2 text-xs text-ink-subtle mb-0.5">
                      <span>{new Date(item.updated_at).toLocaleString()}</span>
                      <span>{item.message_count} msgs</span>
                    </div>
                    <p className="text-sm text-ink line-clamp-2">
                      {item.last_message_preview || 'Conversation'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="chat-shell flex flex-col min-h-[min(70vh,640px)] max-h-[min(78vh,720px)]">
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-white/10 bg-gradient-to-r from-brand-dark via-[#145224] to-brand">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white ring-2 ring-white/20">
              <Sparkles size={18} />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-300 ring-2 ring-brand-dark" />
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-semibold text-sm tracking-tight">AI Apprentice Assistant</h2>
            <p className="text-emerald-100/70 text-xs truncate">Confidential daily experience reporting</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-4 bg-gradient-to-b from-surface-muted/80 to-surface chat-scroll">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-ink-muted">
              <div className="h-10 w-10 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
              <p className="text-sm">Starting your assistant…</p>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <MessageBubble key={m.message_id} message={m} />
              ))}
              {sending && <TypingIndicator />}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        <div className="border-t border-line bg-surface-raised p-3 sm:p-4">
          <div className="flex items-end gap-2">
            <label htmlFor="experience-input" className="sr-only">
              Tell me about your day
            </label>
            <textarea
              id="experience-input"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading || sending || !conversation}
              placeholder="Tell me about your day…"
              className="flex-1 resize-none max-h-32 min-h-[44px] rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-subtle focus-ring disabled:opacity-60"
            />
            <Button
              variant="primary"
              size="md"
              icon={Send}
              loading={sending}
              disabled={!input.trim() || loading || !conversation}
              onClick={() => send()}
              aria-label="Send message"
              className="!rounded-2xl !px-4 !py-3 shrink-0"
            >
              <span className="sr-only sm:not-sr-only sm:inline">Send</span>
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-ink-subtle flex items-center gap-1.5">
            <AlertTriangle size={11} />
            Enter to send · Shift+Enter for a new line · Not for life-threatening emergencies
          </p>
        </div>
      </div>
    </div>
  );
}
