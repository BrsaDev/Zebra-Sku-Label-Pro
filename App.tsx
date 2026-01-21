
import React, { useState } from 'react';
import { 
  FileUp, Download, CheckCircle2, Printer, 
  AlertCircle, QrCode, Tag, RefreshCcw, 
  Brain, Sparkles, Code, Cpu 
} from 'lucide-react';
import { LabelData, ProcessingEngine } from './types';
import { extractTextFromPDF, generateSKULabels } from './utils/pdfUtils';
import { extractLabelData as extractWithGemini } from './services/geminiService';
import { extractWithOpenAI } from './services/openaiService';
import { extractWithRegex } from './services/regexService';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState<ProcessingEngine>('gemini');
  const [processingStatus, setProcessingStatus] = useState("");
  const [results, setResults] = useState<LabelData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults([]);
      setError(null);
    }
  };

  const processFile = async () => {
    if (!file) return;

    setLoading(true);
    setResults([]);
    setError(null);
    
    try {
      setProcessingStatus("Lendo arquivo PDF...");
      const text = await extractTextFromPDF(file);
      
      let labelData: LabelData[] = [];

      switch (engine) {
        case 'gemini':
          setProcessingStatus("Analisando com Google Gemini...");
          labelData = await extractWithGemini(text);
          break;
        case 'openai':
          setProcessingStatus("Analisando com OpenAI GPT-4o...");
          labelData = await extractWithOpenAI(text);
          break;
        case 'local':
          setProcessingStatus("Processando localmente (Regex)...");
          labelData = await extractWithRegex(text);
          break;
      }
      
      if (labelData.length === 0) {
        throw new Error("Não foi possível identificar SKUs ou Barcodes com o motor selecionado.");
      }

      setResults(labelData);
      setProcessingStatus("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro inesperado ao processar o arquivo.");
    } finally {
      setLoading(false);
    }
  };

  const downloadAll = async () => {
    for (const item of results) {
      await generateSKULabels(item.sku, item.barcode, item.count);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <header className="bg-[#006494] text-white p-6 shadow-lg sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl">
              <Printer className="w-8 h-8 text-[#00A6FB]" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none">Zebra SKU Label Pro</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60 mt-1">Multi-Engine Processing System</p>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end">
            <div className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
              PADRÃO ZEBRA: 40x25mm • 2-UP
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 md:p-10">
        <section className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-10">
          <div className="p-8 md:p-12">
            <div className="flex flex-col items-center text-center mb-10">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all duration-500 shadow-inner ${file ? 'bg-blue-50 text-[#00A6FB] scale-110' : 'bg-slate-50 text-slate-300'}`}>
                <FileUp className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Processar Etiquetas</h2>
              <p className="text-slate-500 max-w-md text-sm leading-relaxed">
                Carregue seu PDF de logística. Nosso sistema identifica SKUs, conta repetições e gera etiquetas individuais.
              </p>
            </div>

            {/* Engine Selector */}
            <div className="max-w-2xl mx-auto mb-8">
              <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Selecione o Motor de Processamento</p>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                <button 
                  onClick={() => setEngine('gemini')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${engine === 'gemini' ? 'bg-white text-[#006494] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Brain className="w-4 h-4" />
                  <span className="hidden sm:inline">Gemini AI</span>
                </button>
                <button 
                  onClick={() => setEngine('openai')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${engine === 'openai' ? 'bg-white text-[#006494] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">OpenAI</span>
                </button>
                <button 
                  onClick={() => setEngine('local')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${engine === 'local' ? 'bg-white text-[#006494] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Code className="w-4 h-4" />
                  <span className="hidden sm:inline">Local Regex</span>
                </button>
              </div>
            </div>
            
            <div className="w-full max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
              <label className="flex-1 cursor-pointer group">
                <input 
                  type="file" 
                  accept="application/pdf" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <div className="h-16 bg-white border-2 border-dashed border-slate-200 group-hover:border-[#00A6FB] group-hover:bg-blue-50/30 transition-all rounded-2xl px-6 flex items-center gap-4 text-slate-600 text-sm font-semibold">
                  <div className="bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 text-[10px] uppercase font-black px-2.5 py-1.5 rounded-lg transition-colors">PDF</div>
                  <span className="truncate flex-1">
                    {file ? file.name : "Clique para selecionar arquivo"}
                  </span>
                </div>
              </label>
              
              <button 
                onClick={processFile}
                disabled={!file || loading}
                className="h-16 px-10 bg-[#00A6FB] hover:bg-[#006494] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-black transition-all shadow-lg shadow-blue-200 active:scale-95 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <RefreshCcw className="w-6 h-6 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-6 h-6" />
                    Iniciar Análise
                  </>
                )}
              </button>
            </div>

            {loading && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                </div>
                <p className="text-[#006494] text-sm font-black italic">
                  {processingStatus}
                </p>
              </div>
            )}

            {error && (
              <div className="mt-8 w-full max-w-2xl mx-auto bg-red-50 text-red-600 p-6 rounded-[1.5rem] border border-red-100 flex items-start gap-4 animate-in fade-in zoom-in duration-300">
                <div className="bg-red-100 p-2 rounded-xl">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider mb-1">Erro no Processamento</h3>
                  <p className="text-sm opacity-90 leading-relaxed">{error}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {results.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
              <div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">Itens Identificados</h3>
                <p className="text-slate-500 text-sm mt-1">Foram encontrados {results.length} modelos de etiquetas diferentes.</p>
              </div>
              <button 
                onClick={downloadAll}
                className="w-full md:w-auto flex items-center justify-center gap-3 bg-[#006494] hover:bg-slate-900 text-white px-10 py-5 rounded-3xl font-black shadow-xl shadow-slate-200 transition-all hover:-translate-y-1 active:scale-95 group"
              >
                <Download className="w-6 h-6 group-hover:animate-bounce" />
                BAIXAR TODOS OS PDFs
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {results.map((item, idx) => (
                <div key={idx} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-slate-200 transition-all duration-300 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 transition-colors group-hover:bg-blue-50/50"></div>
                  
                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="bg-blue-50 text-[#00A6FB] p-4 rounded-2xl shadow-sm">
                      <Tag className="w-7 h-7" />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Quantidade</p>
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-4xl font-black text-[#006494] leading-none">{item.count}</span>
                        <span className="text-xs font-bold text-slate-400 uppercase">unid</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 mb-10 relative z-10">
                    <div>
                      <h4 className="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-widest">SKU Identificado</h4>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 font-mono font-bold text-slate-800 text-lg break-all group-hover:border-blue-200 transition-colors">
                        {item.sku}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-widest">Conteúdo do QR (Barcode)</h4>
                      <p className="text-xs font-mono text-slate-400 truncate px-2">{item.barcode}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => generateSKULabels(item.sku, item.barcode, item.count)}
                    className="relative z-10 w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl transition-all font-black text-sm hover:bg-[#00A6FB] hover:shadow-lg shadow-blue-200 active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    Gerar PDF (Etiquetas)
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && results.length === 0 && !error && (
          <div className="mt-12 text-center py-24 px-6 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <QrCode className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-400">Aguardando seu arquivo</h3>
            <p className="text-slate-300 text-sm mt-2">Os resultados da análise aparecerão aqui.</p>
          </div>
        )}
      </main>

      <footer className="py-10 text-center border-t border-slate-100 mt-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-400 text-[10px] uppercase tracking-[0.3em] font-black">
            Zebra 40x25mm • Layout 2-UP • QR Centralizado • Sem Bordas
          </p>
          <div className="flex gap-4">
            <span className="text-[9px] font-black text-[#006494] bg-blue-50 px-2 py-1 rounded">V2.0 MULTI-ENGINE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
