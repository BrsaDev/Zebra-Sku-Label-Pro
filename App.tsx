
import React, { useState } from 'react';
import { FileUp, Loader2, Download, CheckCircle2, Printer, AlertCircle, QrCode, Tag, RefreshCcw } from 'lucide-react';
import { LabelData } from './types';
import { extractTextFromPDF, generateSKULabels } from './utils/pdfUtils';
import { extractLabelData } from './services/geminiService';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
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
      setProcessingStatus("Extraindo texto do PDF...");
      const text = await extractTextFromPDF(file);
      
      setProcessingStatus("Analisando com IA (isso pode levar alguns segundos)...");
      const labelData = await extractLabelData(text);
      
      if (labelData.length === 0) {
        throw new Error("Não foi possível identificar SKUs ou Barcodes no arquivo.");
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
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#006494] text-white p-6 shadow-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Printer className="w-8 h-8 text-[#00A6FB]" />
            <h1 className="text-2xl font-bold tracking-tight">Zebra SKU Label Pro</h1>
          </div>
          <div className="text-sm font-medium opacity-80 bg-white/10 px-3 py-1 rounded-full">
            40x25mm • 2-up • Somente SKU + QR
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-8">
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors ${file ? 'bg-blue-50 text-[#00A6FB]' : 'bg-slate-50 text-slate-400'}`}>
              <FileUp className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Processar Etiquetas</h2>
            <p className="text-slate-500 mb-8 max-w-md text-sm">
              Carregue o PDF original. A IA contará as repetições e gerará os arquivos prontos para impressão Zebra.
            </p>
            
            <div className="w-full max-w-xl bg-slate-50 p-2 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-2">
              <label className="flex-1 cursor-pointer group">
                <input 
                  type="file" 
                  accept="application/pdf" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <div className="h-full min-h-[56px] bg-white border border-slate-200 group-hover:border-[#00A6FB] transition-colors rounded-xl px-4 flex items-center gap-3 text-slate-600 text-sm font-medium overflow-hidden">
                  <span className="shrink-0 bg-slate-100 text-slate-500 text-[10px] uppercase font-bold px-2 py-1 rounded">PDF</span>
                  <span className="truncate flex-1 text-left">
                    {file ? file.name : "Selecione o arquivo..."}
                  </span>
                </div>
              </label>
              
              <button 
                onClick={processFile}
                disabled={!file || loading}
                className="h-[56px] sm:h-auto sm:px-8 bg-[#00A6FB] hover:bg-[#006494] disabled:bg-slate-300 text-white rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 min-w-[180px]"
              >
                {loading ? (
                  <>
                    <RefreshCcw className="w-5 h-5 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Analisar Arquivo
                  </>
                )}
              </button>
            </div>

            {loading && (
              <div className="mt-6 flex flex-col items-center gap-2">
                <p className="text-[#006494] text-sm font-bold animate-pulse">
                  {processingStatus}
                </p>
                <p className="text-slate-400 text-[10px] uppercase tracking-wider">Aguarde a resposta da IA</p>
              </div>
            )}

            {error && (
              <div className="mt-6 w-full max-w-xl bg-red-50 text-red-600 p-5 rounded-xl border border-red-100 flex items-start gap-3 text-left">
                <AlertCircle className="shrink-0 w-5 h-5 mt-0.5" />
                <div>
                  <span className="text-sm font-bold block mb-1">Ops! Algo deu errado</span>
                  <p className="text-xs opacity-90">{error}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {results.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Resultados da Contagem</h3>
                <p className="text-slate-500 text-sm">Cada SKU abaixo terá seu próprio PDF com a quantidade exata.</p>
              </div>
              <button 
                onClick={downloadAll}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#006494] hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95"
              >
                <Download className="w-5 h-5" />
                Baixar Todos os PDFs
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((item, idx) => (
                <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
                  <div className="flex items-center justify-between mb-6">
                    <div className="bg-blue-50 text-[#00A6FB] p-3 rounded-2xl">
                      <Tag className="w-6 h-6" />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total SKU</p>
                      <p className="text-3xl font-black text-[#006494]">{item.count}</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div>
                      <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">SKU Impresso</h4>
                      <p className="text-xl font-mono font-bold text-slate-800 truncate bg-slate-50 p-2 rounded-lg border border-slate-100">{item.sku}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Conteúdo do QR</h4>
                      <p className="text-sm font-mono text-slate-500 truncate">{item.barcode}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => generateSKULabels(item.sku, item.barcode, item.count)}
                    className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-[#00A6FB] hover:text-white text-[#006494] py-3 rounded-2xl transition-all font-bold text-sm border border-slate-100"
                  >
                    <Download className="w-4 h-4" />
                    Gerar PDF deste SKU
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && results.length === 0 && !error && (
          <div className="mt-12 text-center py-20 px-4 bg-white/50 rounded-3xl border border-dashed border-slate-300">
            <QrCode className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Aguardando upload de arquivo para análise...</p>
          </div>
        )}
      </main>

      <footer className="p-8 text-center text-slate-400 text-[10px] uppercase tracking-[0.2em] font-bold border-t border-slate-200 mt-12 bg-white">
        Zebra 40x25mm • Layout 2-UP • QR Centralizado • Sem Bordas
      </footer>
    </div>
  );
}
