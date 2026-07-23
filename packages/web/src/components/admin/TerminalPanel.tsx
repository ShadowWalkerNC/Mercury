import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { api } from '@/lib/api';
import { gateway } from '@/lib/gateway';
import { WSOp } from '@mercury/shared';

interface HistoryItem {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  timestamp: string;
}

export function TerminalPanel() {
  const [history, setHistory] = useState<HistoryItem[]>([
    {
      id: 'init-1',
      command: 'welcome',
      output: `Mercury Remote Shell Terminal [v0.1.0]
Type any command (e.g., 'sysinfo', 'ls', 'dir', 'node -v') to execute on the host machine.
All commands run under operator authorization. Use with care.`,
      exitCode: 0,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, busy]);

  useEffect(() => {
    const off = gateway.on(WSOp.TERMINAL_DATA, (p) => {
      const { command, output, exit_code } = p.d as { command: string; output: string; exit_code: number };
      setHistory((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          command: command || 'exec',
          output: output || '(no output)',
          exitCode: exit_code ?? 0,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      ]);
      setBusy(false);
    });
    return off;
  }, []);

  async function executeCommand(cmdStr: string) {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === 'clear' || trimmed.toLowerCase() === 'cls') {
      setHistory([]);
      setInputVal('');
      return;
    }

    setBusy(true);
    setCmdHistory((prev) => [trimmed, ...prev.filter((c) => c !== trimmed)]);
    setHistoryIdx(-1);
    setInputVal('');

    try {
      // Try WebSocket first
      if (gateway.connected) {
        gateway.send({
          op: WSOp.TERMINAL_EXEC,
          d: { command: trimmed },
        });
      } else {
        // Fallback to REST API if WebSocket is connecting
        const res = await api.post<{ command: string; output: string; exit_code: number }>(
          '/api/v1/admin/shell/exec',
          { command: trimmed }
        );
        setHistory((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            command: res.command,
            output: res.output,
            exitCode: res.exit_code,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          },
        ]);
        setBusy(false);
      }
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          command: trimmed,
          output: `Error executing command: ${err instanceof Error ? err.message : 'Execution failed'}`,
          exitCode: 1,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      ]);
      setBusy(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void executeCommand(inputVal);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(nextIdx);
      setInputVal(cmdHistory[nextIdx] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInputVal(cmdHistory[nextIdx] ?? '');
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInputVal('');
      }
    }
  }

  const PRESETS = [
    { label: 'System Info', cmd: process.platform === 'win32' ? 'systeminfo' : 'uname -a' },
    { label: 'Directory List', cmd: process.platform === 'win32' ? 'dir' : 'ls -la' },
    { label: 'Node Version', cmd: 'node -v' },
    { label: 'Uptime', cmd: process.platform === 'win32' ? 'Get-Date' : 'uptime' },
    { label: 'Clear Screen', cmd: 'clear' },
  ];

  return (
    <div style={css.container}>
      {/* Quick Actions Toolbar */}
      <div style={css.toolbar}>
        <span style={css.terminalBadge}>
          <span style={css.activeDot} /> SSH / Remote Shell Terminal
        </span>
        <div style={css.presetsGroup}>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              disabled={busy}
              style={css.presetBtn}
              onClick={() => void executeCommand(p.cmd)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Display */}
      <div style={css.screen} onClick={() => inputRef.current?.focus()}>
        {history.map((item) => (
          <div key={item.id} style={css.block}>
            <div style={css.cmdRow}>
              <span style={css.prompt}>mercury-operator@host:~$</span>
              <span style={css.cmdText}>{item.command}</span>
              <span style={css.timestamp}>{item.timestamp}</span>
            </div>
            <pre style={{
              ...css.output,
              color: item.exitCode !== 0 ? 'var(--danger, #ef4444)' : 'rgba(255,255,255,0.85)',
            }}>
              {item.output}
            </pre>
          </div>
        ))}

        {busy && (
          <div style={css.cmdRow}>
            <span style={css.prompt}>mercury-operator@host:~$</span>
            <span style={{ fontSize: 13, color: 'var(--accent-bright, #c084fc)', fontFamily: 'var(--font-mono)' }}>
              Executing command…
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Terminal Input Bar */}
      <form onSubmit={handleSubmit} style={css.inputBar}>
        <span style={css.promptInput}>mercury-operator@host:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={busy ? 'Waiting for command response…' : 'Type shell command and press Enter…'}
          disabled={busy}
          style={css.input}
          autoFocus
        />
        <button type="submit" disabled={busy || !inputVal.trim()} style={css.execBtn}>
          Run Command
        </button>
      </form>
    </div>
  );
}

const css: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '620px',
    background: '#090a0f',
    border: '1px solid var(--border-violet, rgba(192, 132, 252, 0.2))',
    borderRadius: 'var(--radius-md, 12px)',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    background: 'rgba(255,255,255,0.03)',
    borderBottom: '1px solid var(--border-violet, rgba(192, 132, 252, 0.15))',
    flexWrap: 'wrap',
    gap: 8,
  },
  terminalBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    fontWeight: 700,
    fontFamily: 'var(--font-mono, monospace)',
    color: 'var(--accent-bright, #c084fc)',
    letterSpacing: '0.05em',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 8px #22c55e',
  },
  presetsGroup: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  presetBtn: {
    padding: '3px 10px',
    fontSize: 11,
    fontFamily: 'var(--font-mono, monospace)',
    background: 'rgba(192, 132, 252, 0.08)',
    border: '1px solid rgba(192, 132, 252, 0.2)',
    borderRadius: 4,
    color: 'var(--text-secondary, #94a3b8)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  screen: {
    flex: 1,
    overflowY: 'auto',
    padding: 16,
    fontFamily: 'var(--font-mono, Consolas, Monaco, monospace)',
    fontSize: 13,
    lineHeight: 1.5,
    cursor: 'text',
  },
  block: {
    marginBottom: 16,
  },
  cmdRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  prompt: {
    color: '#38bdf8',
    fontWeight: 700,
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 12,
  },
  cmdText: {
    color: '#f8fafc',
    fontWeight: 600,
  },
  timestamp: {
    fontSize: 10,
    color: '#64748b',
    marginLeft: 'auto',
  },
  output: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: 12,
    fontFamily: 'var(--font-mono, monospace)',
    background: 'rgba(0, 0, 0, 0.4)',
    padding: '8px 12px',
    borderRadius: 6,
    borderLeft: '2px solid rgba(192, 132, 252, 0.3)',
  },
  inputBar: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    background: '#040508',
    borderTop: '1px solid var(--border-violet, rgba(192, 132, 252, 0.15))',
    gap: 10,
  },
  promptInput: {
    color: '#38bdf8',
    fontWeight: 700,
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 12,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#f8fafc',
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 13,
  },
  execBtn: {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'var(--font-mono, monospace)',
    background: 'var(--accent, #a855f7)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    flexShrink: 0,
  },
};
