// components/ai/AiPanel.jsx
import React from 'react';
import { Sparkles, X as CloseIcon, Bot, ArrowRight } from 'lucide-react';

export default function AiPanel({
  showAI,
  setShowAI,
  messages,
  errorAI,
  isLoadingAI,
  userText,
  setUserText,
  handleSubmit,
  chatEndRef,
  stockInfo,
}) {
  return (
    <div className="absolute top-0 right-0 w-full md:w-[400px] h-full bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
        <h3 className="font-bold text-lg flex items-center gap-2 text-purple-400">
          <Sparkles size={18} /> Assistant Bourse (Gemini)
        </h3>
        <button onClick={() => setShowAI(false)}>
          <CloseIcon size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {errorAI && (
          <div className="bg-red-500/20 text-red-400 p-3 rounded-lg text-xs border border-red-500/50 mb-4">
            ⚠️ Erreur : {errorAI.message}
          </div>
        )}

        {messages.length === 0 && (
          <div className="text-center text-slate-500 mt-10 text-sm">
            <Bot className="mx-auto mb-3 text-slate-600" size={40} />
            <p>Je suis prêt à analyser {stockInfo?.symbol || 'le marché'}.</p>
            <p>Pose-moi une question !</p>
          </div>
        )}

        {(messages || []).map((m) => (
          <div
            key={m.id}
            className={`flex ${
              m.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-line ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-200'
              }`}
            >
              {m.role === 'assistant' && (
                <span className="font-bold text-purple-400 block mb-1 text-xs">
                  IA
                </span>
              )}
              {m.content}
            </div>
          </div>
        ))}

        {isLoadingAI && (
          <div className="text-slate-500 text-xs ml-4 animate-pulse flex items-center gap-2">
            <Sparkles size={12} /> Analyse en cours...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-slate-800 bg-slate-950 flex gap-2"
      >
        <input
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          placeholder="Posez une question sur les actions..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-2 text-sm focus:border-purple-500 outline-none"
        />
        <button
          type="submit"
          disabled={isLoadingAI || !userText.trim()}
          className="p-2 bg-purple-600 rounded-full text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
        >
          <ArrowRight size={18} />
        </button>
      </form>
    </div>
  );
}
