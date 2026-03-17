import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowLeft, Save, Clock, RotateCcw, Users, X, Upload, Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Code, Quote, Minus, Link, CheckSquare } from 'lucide-react';
import { marked } from 'marked';
import useStore from '../store';
import * as api from '../api';
import { getSocket } from '../socket';

marked.setOptions({ breaks: true, gfm: true });

export default function NoteEditor() {
  const { navigate, currentDeckId: compositeId, user } = useStore();
  const [courseId, noteId] = (compositeId || '').split(':');

  const [note, setNote] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [presence, setPresence] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [focused, setFocused] = useState(false);
  const [importing, setImporting] = useState(false);

  const textareaRef = useRef(null);
  const wrapperRef = useRef(null);
  const saveTimerRef = useRef(null);
  const socketRef = useRef(null);
  const suppressRemoteRef = useRef(false);
  const fileInputRef = useRef(null);

  // Load note
  useEffect(() => {
    if (!courseId || !noteId) return;
    (async () => {
      try {
        const data = await api.fetchNote(courseId, noteId);
        setNote(data);
        setContent(data.content || '');
        setTitle(data.title || '');
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [courseId, noteId]);

  // Socket
  useEffect(() => {
    if (!noteId) return;
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;
    socket.emit('join-note', { noteId });
    socket.on('note:presence', setPresence);
    socket.on('note:updated', ({ content: c, title: t, updatedAt }) => {
      suppressRemoteRef.current = true;
      setContent(c); setTitle(t); setLastSaved(updatedAt); setDirty(false);
      setTimeout(() => { suppressRemoteRef.current = false; }, 50);
    });
    return () => {
      socket.emit('leave-note', { noteId });
      socket.off('note:presence');
      socket.off('note:updated');
    };
  }, [noteId]);

  // Auto-save
  const scheduleAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(), 1500);
  }, [courseId, noteId]);

  const doSave = async () => {
    if (!courseId || !noteId) return;
    setSaving(true);
    try {
      await api.updateNote(courseId, noteId, { content, title });
      setLastSaved(Date.now()); setDirty(false);
      const s = socketRef.current;
      if (s) s.emit('note:update', { noteId, content, title });
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleManualSave = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaving(true);
    try {
      await api.updateNote(courseId, noteId, { content, title });
      await api.saveNoteHistory(courseId, noteId);
      setLastSaved(Date.now()); setDirty(false);
      const s = socketRef.current;
      if (s) { s.emit('note:update', { noteId, content, title }); s.emit('note:save-history', { noteId }); }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // Toolbar insert helpers
  const insertAtCursor = useCallback((before, after = '', placeholder = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = content.substring(s, e) || placeholder;
    setContent(content.substring(0, s) + before + sel + after + content.substring(e));
    setDirty(true);
    if (!suppressRemoteRef.current) scheduleAutoSave();
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + before.length, s + before.length + sel.length); }, 10);
  }, [content, scheduleAutoSave]);

  const insertLinePrefix = useCallback((prefix) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const ls = content.lastIndexOf('\n', s - 1) + 1;
    const le = content.indexOf('\n', s);
    const line = content.substring(ls, le === -1 ? content.length : le);
    if (line.startsWith(prefix)) {
      setContent(content.substring(0, ls) + line.substring(prefix.length) + content.substring(le === -1 ? content.length : le));
    } else {
      setContent(content.substring(0, ls) + prefix + line + content.substring(le === -1 ? content.length : le));
    }
    setDirty(true);
    if (!suppressRemoteRef.current) scheduleAutoSave();
    setTimeout(() => ta.focus(), 10);
  }, [content, scheduleAutoSave]);

  const toolbarActions = [
    { icon: Bold, label: 'Bold', action: () => insertAtCursor('**', '**', 'bold'), key: 'Ctrl+B' },
    { icon: Italic, label: 'Italic', action: () => insertAtCursor('*', '*', 'italic'), key: 'Ctrl+I' },
    { type: 'sep' },
    { icon: Heading1, label: 'H1', action: () => insertLinePrefix('# ') },
    { icon: Heading2, label: 'H2', action: () => insertLinePrefix('## ') },
    { icon: Heading3, label: 'H3', action: () => insertLinePrefix('### ') },
    { type: 'sep' },
    { icon: List, label: 'Bullets', action: () => insertLinePrefix('- ') },
    { icon: ListOrdered, label: 'Numbers', action: () => insertLinePrefix('1. ') },
    { icon: CheckSquare, label: 'Tasks', action: () => insertLinePrefix('- [ ] ') },
    { type: 'sep' },
    { icon: Code, label: 'Code', action: () => insertAtCursor('`', '`', 'code') },
    { icon: Quote, label: 'Quote', action: () => insertLinePrefix('> ') },
    { icon: Minus, label: 'Rule', action: () => insertAtCursor('\n---\n', '') },
    { icon: Link, label: 'Link', action: () => insertAtCursor('[', '](url)', 'link') },
  ];

  const handleContentChange = (e) => {
    setContent(e.target.value);
    setDirty(true);
    if (!suppressRemoteRef.current) scheduleAutoSave();
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    setDirty(true);
    if (!suppressRemoteRef.current) scheduleAutoSave();
  };

  // Click on the wrapper → focus textarea
  const handleAreaClick = (e) => {
    // Don't steal focus from toolbar buttons
    if (e.target.closest('.note-toolbar')) return;
    if (textareaRef.current && e.target !== textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Track focus state
  const handleFocus = () => setFocused(true);
  const handleBlur = (e) => {
    // Don't blur if clicking toolbar buttons
    if (e.relatedTarget?.closest?.('.note-toolbar')) {
      e.preventDefault();
      textareaRef.current?.focus();
      return;
    }
    setFocused(false);
  };

  // History
  const loadHistory = async () => {
    setHistoryLoading(true);
    try { setHistory(await api.fetchNoteHistory(courseId, noteId)); }
    catch (err) { console.error(err); }
    finally { setHistoryLoading(false); }
  };
  const toggleHistory = () => { if (!showHistory) loadHistory(); setShowHistory(!showHistory); };
  const handleRestore = async (historyId) => {
    if (!confirm('Restore this version?')) return;
    try {
      const r = await api.restoreNoteVersion(courseId, noteId, historyId);
      setContent(r.content); setTitle(r.title); setLastSaved(r.updated_at); setDirty(false);
      loadHistory();
      const s = socketRef.current;
      if (s) s.emit('note:update', { noteId, content: r.content, title: r.title });
    } catch (err) { console.error(err); }
  };

  // Import
  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    try {
      const r = await api.extractTextFromFile(file);
      const sep = content.trim() ? '\n\n---\n\n' : '';
      setContent(prev => prev + sep + `## Imported from: ${r.filename}\n\n` + r.text);
      setDirty(true); scheduleAutoSave();
    } catch (err) { alert('Import failed: ' + err.message); }
    finally { setImporting(false); }
  };

  // Shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleManualSave(); }
      if (focused && (e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); insertAtCursor('**', '**', 'bold'); }
      if (focused && (e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); insertAtCursor('*', '*', 'italic'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [content, title, insertAtCursor, focused]);

  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  const renderedHtml = useMemo(() => {
    try { return marked.parse(content || ''); }
    catch { return ''; }
  }, [content]);

  const formatTime = (ts) => ts ? new Date(ts).toLocaleString() : '';
  const otherUsers = presence.filter(u => u.userId !== user?.id);

  if (loading) return (
    <div className="page-body" style={{ textAlign: 'center', paddingTop: 60 }}>
      <div style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-amber)', textTransform: 'uppercase' }}>Loading note...</div>
    </div>
  );

  if (!note) return (
    <>
      <div className="page-header"><h2>Note</h2></div>
      <div className="page-body">
        <p style={{ color: 'var(--text-muted)' }}>Note not found.</p>
        <button className="btn btn-sm" onClick={() => navigate('courses')}><ArrowLeft size={14} /> Back</button>
      </div>
    </>
  );

  return (
    <>
      {/* Header */}
      <div className="page-header" style={{ padding: '16px 40px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-icon btn-sm" onClick={() => navigate('course-view', courseId)}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ flex: 1 }}>
            <input className="note-title-input" value={title} onChange={handleTitleChange} placeholder="Note title..." />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {otherUsers.length > 0 && (
              <div className="presence-avatars">
                {otherUsers.map(u => (
                  <div key={u.userId} className="presence-dot" title={u.username}>{u.username.charAt(0).toUpperCase()}</div>
                ))}
              </div>
            )}
            <div className="save-status">
              {saving ? <span className="saving">Saving...</span>
                : dirty ? <span className="unsaved">Unsaved</span>
                : lastSaved ? <span className="saved">Saved</span>
                : null}
            </div>
            {otherUsers.length > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Users size={13} /> {otherUsers.length + 1} editing
              </span>
            )}
            <button className="btn btn-sm" onClick={() => fileInputRef.current?.click()} disabled={importing} title="Import PDF/DOCX/TXT">
              <Upload size={14} /> {importing ? 'Importing...' : 'Import'}
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md,.csv" style={{ display: 'none' }} onChange={handleFileImport} />
            <button className="btn btn-sm" onClick={toggleHistory}><Clock size={14} /> History</button>
            <button className="btn btn-primary btn-sm" onClick={handleManualSave} title="Ctrl+S"><Save size={14} /> Save</button>
          </div>
        </div>
      </div>

      {/* Unified Editor Area */}
      <div className="note-editor-layout">
        <div className="note-editor-main" ref={wrapperRef} onClick={handleAreaClick}>
          {/* Toolbar — shows when focused */}
          <div className={`note-toolbar ${focused ? 'visible' : ''}`}>
            <div className="editor-toolbar-actions">
              {toolbarActions.map((item, i) =>
                item.type === 'sep' ? (
                  <div key={i} className="toolbar-divider" />
                ) : (
                  <button key={i} className="toolbar-btn" onMouseDown={(e) => e.preventDefault()} onClick={item.action}
                    title={item.label + (item.key ? ` (${item.key})` : '')}>
                    <item.icon size={15} />
                  </button>
                )
              )}
            </div>
            <div className="note-word-count-inline">
              {content.length} chars &bull; {content.split(/\s+/).filter(Boolean).length} words
            </div>
          </div>

          {/* The single content area — textarea + preview stacked */}
          <div className="note-unified-content">
            {/* Textarea (always present, visible when focused) */}
            <textarea
              ref={textareaRef}
              className={`note-textarea-unified ${focused ? 'active' : ''}`}
              value={content}
              onChange={handleContentChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={"Start typing your notes...\n\n# Heading\n**Bold** *Italic*\n- Lists\n> Quotes\n`code`"}
              spellCheck
            />

            {/* Preview (visible when NOT focused) */}
            {!focused && (
              <div className="note-rendered-layer markdown-body">
                {content.trim() ? (
                  <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
                ) : (
                  <div className="note-placeholder-text">
                    Click anywhere to start writing...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="note-history-panel">
            <div className="history-panel-header">
              <span><Clock size={14} /> Version History</span>
              <button className="btn btn-icon btn-sm" onClick={() => setShowHistory(false)}><X size={14} /></button>
            </div>
            <div className="history-panel-body">
              {historyLoading ? (
                <div style={{ padding: 20, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Loading...</div>
              ) : history.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  No saved versions yet.
                </div>
              ) : history.map(h => (
                <div key={h.id} className="history-entry">
                  <div className="history-entry-header">
                    <span className="history-author">{h.edited_by_name}</span>
                    <span className="history-time">{formatTime(h.created_at)}</span>
                  </div>
                  <div className="history-preview">{(h.content || '').slice(0, 120).replace(/\n/g, ' ') || '(empty)'}{h.content?.length > 120 && '...'}</div>
                  <button className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => handleRestore(h.id)}>
                    <RotateCcw size={12} /> Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
