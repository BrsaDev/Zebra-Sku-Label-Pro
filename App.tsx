
import React, { useState } from 'react';
import { FileUp, Loader2, Download, CheckCircle2, Printer, AlertCircle, QrCode, Tag } from 'lucide-react';
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
      
      setProcessingStatus("Analisando SKUs e Barcodes com IA...");
      const labelData = await extractLabelData(text);
      
      if (labelData.length === 0) {
        throw new Error("Não foi possível identificar SKUs ou Barcodes no arquivo.");
      }

      setResults(labelData);
      setProcessingStatus("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao processar o arquivo.");
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
      {/* Header */}
      <header className="bg-[#006494] text-white p-6 shadow-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Printer className="w-8 h-8 text-[#00A6FB]" />
            <h1 className="text-2xl font-bold tracking-tight">Zebra SKU Label Pro</h1>
          </div>
          <div className="text-sm font-medium opacity-80">
            Zebra 40x25mm (2-up) | QR=Barcode
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-8">
        {/* Upload Section */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors ${file ? 'bg-blue-50 text-[#00A6FB]' : 'bg-slate-50 text-slate-400'}`}>
              <FileUp className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Processar Etiquetas</h2>
            <p className="text-slate-500 mb-8 max-w-md text-sm">
              A IA lerá os dados e configurará o QR Code com o <b>Barcode</b> e o texto da etiqueta com o <b>SKU</b>.
            </p>
            
            {/* Input Group - "Encaixado" Layout */}
            <div className="w-full max-w-xl bg-slate-50 p-2 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-2 transition-all focus-within:border-[#00A6FB]/50 focus-within:ring-4 focus-within:ring-[#00A6FB]/5">
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
                    {file ? file.name : "Selecione o arquivo original..."}
                  </span>
                </div>
              </label>
              
              <button 
                onClick={processFile}
                disabled={!file || loading}
                className="h-[56px] sm:h-auto sm:px-8 bg-[#00A6FB] hover:bg-[#006494] disabled:bg-slate-300 text-white rounded-xl font-bold transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2 min-w-[180px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="hidden sm:inline">Analisando...</span>
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
              <p className="mt-6 text-[#006494] text-sm font-bold flex items-center gap-2 animate-pulse">
                {processingStatus}
              </p>
            )}

            {error && (
              <div className="mt-6 w-full max-w-xl bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3 text-left">
                <AlertCircle className="shrink-0 w-5 h-5" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
          </div>
        </section>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Produtos Identificados</h3>
                <p className="text-slate-500 text-sm">Prontos para conversão Zebra 40x25mm.</p>
              </div>
              <button 
                onClick={downloadAll}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#006494] hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-all active:scale-95"
              >
                <Download className="w-5 h-5" />
                Baixar Todos os PDFs
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((item, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <QrCode className="w-12 h-12" />
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-blue-50 text-[#00A6FB] p-2 rounded-lg">
                      <Tag className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Produto {idx + 1}</span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div>
                      <h4 className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1 tracking-wider">SKU (Visível)</h4>
                      <p className="text-lg font-mono font-bold text-slate-800 truncate">{item.sku}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1 tracking-wider">Barcode (No QR)</h4>
                      <p className="text-sm font-mono text-slate-600 truncate">{item.barcode}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Etiquetas</p>
                      <p className="text-3xl font-black text-[#006494]">{item.count}</p>
                    </div>
                    <button 
                      onClick={() => generateSKULabels(item.sku, item.barcode, item.count)}
                      className="flex items-center gap-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-[#00A6FB] px-4 py-2 rounded-xl transition-all font-bold text-sm"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && results.length === 0 && !error && (
          <div className="mt-12 text-center py-16 px-4 bg-white/50 rounded-3xl border border-dashed border-slate-300">
            <p className="text-slate-400 font-medium italic mb-8">Nenhum dado processado ainda...</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <QrCode className="w-5 h-5 text-[#00A6FB]" />
                    <div className="text-left">
                      <div className="font-bold text-xs text-slate-800">Conteúdo QR</div>
                      <p className="text-[10px] text-slate-500 leading-tight">Será gerado a partir do Barcode EAN/UPC.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <Tag className="w-5 h-5 text-[#006494]" />
                    <div className="text-left">
                      <div className="font-bold text-xs text-slate-800">Texto SKU</div>
                      <p className="text-[10px] text-slate-500 leading-tight">Será o único texto visível na etiqueta.</p>
                    </div>
                </div>
            </div>
          </div>
        )}
      </main>

      <footer className="p-8 text-center text-slate-400 text-[10px] uppercase tracking-[0.2em] font-bold border-t border-slate-200 mt-12 bg-white">
        Zebra 40x25mm • 2 Etiquetas Paralelas • QR centralizado • Somente SKU
      </footer>
    </div>
  );
}
