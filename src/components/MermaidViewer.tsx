import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Copy, Check, ZoomIn, ZoomOut, RotateCcw, Code2 } from 'lucide-react';

interface MermaidViewerProps {
  id: string;
  chart: string;
  title?: string;
}

export const MermaidViewer: React.FC<MermaidViewerProps> = ({ id, chart, title }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [showSource, setShowSource] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'JetBrains Mono, monospace',
      themeVariables: {
        darkMode: true,
        background: '#090d16',
        primaryColor: '#ef4444',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#dc2626',
        lineColor: '#94a3b8',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0f172a',
        edgeLabelBackground: '#1e293b',
        nodeBorder: '#334155'
      }
    });

    let isMounted = true;
    const renderChart = async () => {
      try {
        setRenderError(null);
        const uniqueId = `mermaid-${id}-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, chart);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (isMounted) {
          setRenderError(err?.message || 'Failed to render Mermaid diagram');
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart, id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header bar */}
      <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="font-semibold text-sm text-slate-200 tracking-wide">
            {title || 'Mermaid Diagram'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
            Mermaid v11
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-850 rounded-lg p-1 border border-slate-800 space-x-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
              className="p-1.5 hover:bg-slate-700/60 rounded text-slate-400 hover:text-white transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-slate-400 px-1.5 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
              className="p-1.5 hover:bg-slate-700/60 rounded text-slate-400 hover:text-white transition"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1.5 hover:bg-slate-700/60 rounded text-slate-400 hover:text-white transition"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle raw source */}
          <button
            onClick={() => setShowSource(!showSource)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition ${
              showSource
                ? 'bg-red-500/20 text-red-300 border-red-500/50'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{showSource ? 'View Diagram' : 'Mermaid Code'}</span>
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center space-x-1.5 transition"
            title="Copy Mermaid Syntax"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Syntax</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="relative min-h-[460px] max-h-[750px] overflow-auto bg-slate-950/90 p-6 flex items-center justify-center">
        {renderError ? (
          <div className="text-center p-8 max-w-lg">
            <div className="text-red-400 font-medium mb-2">Diagram Rendering Notice</div>
            <p className="text-xs text-slate-400 font-mono mb-4">{renderError}</p>
            <button
              onClick={() => setShowSource(true)}
              className="text-xs text-red-400 underline hover:text-red-300"
            >
              View raw Mermaid syntax
            </button>
          </div>
        ) : showSource ? (
          <div className="w-full h-full overflow-auto">
            <pre className="text-xs font-mono text-emerald-300 bg-slate-900/90 p-4 rounded-lg border border-slate-800 leading-relaxed overflow-x-auto selection:bg-emerald-900">
              {chart}
            </pre>
          </div>
        ) : (
          <div
            ref={containerRef}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            className="transition-transform duration-150 flex items-center justify-center w-full"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>
    </div>
  );
};
