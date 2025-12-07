import React, { useState } from 'react';
import { Transaction } from '../types';
import { getFinancialAdvice } from '../services/geminiService';
import { Button } from './Button';
import { ArrowLeft, Sparkles, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  transactions: Transaction[];
  userName: string;
  onBack: () => void;
}

export const AIView: React.FC<Props> = ({ transactions, userName, onBack }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResponse(null);
    try {
      const result = await getFinancialAdvice(query, transactions, userName);
      setResponse(result);
    } catch (err) {
      setResponse("Failed to get response.");
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "How much have I spent on Galaxy?",
    "Total spent on Insurance vs Income?",
    "Summarize my spending habits",
    "How much is left for investment?"
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 bg-white shadow-sm flex items-center gap-4">
         <button onClick={onBack} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
           <ArrowLeft className="w-5 h-5 text-slate-600" />
         </button>
        <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold text-slate-800">WealthTrack Assistant</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Response Area */}
        {response ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 animate-in fade-in slide-in-from-bottom-2">
                <div className="prose prose-sm prose-slate max-w-none">
                    <ReactMarkdown>{response}</ReactMarkdown>
                </div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-purple-500" />
                </div>
                <p>Ask me about your finances, projects, or spending habits!</p>
            </div>
        )}

        {/* Suggestions */}
        {!response && !loading && (
             <div className="grid grid-cols-1 gap-2 mt-auto">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Suggestions</p>
                {suggestions.map(s => (
                    <button 
                        key={s} 
                        onClick={() => setQuery(s)}
                        className="text-left p-3 bg-white rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:border-purple-300 transition-colors"
                    >
                        {s}
                    </button>
                ))}
             </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <form onSubmit={handleAsk} className="flex gap-2">
            <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 p-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                disabled={loading}
            />
            <Button 
                type="submit" 
                disabled={loading || !query.trim()}
                className="bg-purple-600 hover:bg-purple-700 shadow-purple-200 !px-4"
            >
                {loading ? <span className="animate-spin">⏳</span> : <Send className="w-5 h-5" />}
            </Button>
        </form>
      </div>
    </div>
  );
};