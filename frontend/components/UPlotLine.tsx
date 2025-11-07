"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { Box, Stack, FormControlLabel, Switch, Select, MenuItem, Button, TextField } from "@mui/material";

type LineType = "line" | "step" | "points";

type Props = {
  labels: string[];
  data: number[];
  height?: number;
  defaultLog?: boolean;
  defaultLineType?: LineType;
  exportFilenameDefault?: string;
  exportDpiDefault?: number; // DPI (pixels per inch), e.g. 96, 150, 300
  exportTransparentDefault?: boolean;
};

export default function UPlotLine({
  labels,
  data,
  height = 300,
  defaultLog = false,
  defaultLineType = "line",
  exportFilenameDefault = "uplot",
  exportDpiDefault = 300,
  exportTransparentDefault = false,
}: Props) {
  const plotContainerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [logScale, setLogScale] = useState(defaultLog);
  const [lineType, setLineType] = useState<LineType>(defaultLineType);
  const [exportFilename, setExportFilename] = useState(exportFilenameDefault);
  const [exportDPI, setExportDPI] = useState(exportDpiDefault);
  const [exportTransparent, setExportTransparent] = useState(exportTransparentDefault);

  const ySeries = useMemo(() => {
    if (!logScale) return data;
    return data.map((v) => (v > 0 ? Math.log10(v) : null) as any);
  }, [data, logScale]);

  useEffect(() => {
    let jsEl: HTMLScriptElement | null = null;
    let cssEl: HTMLLinkElement | null = null;
    function ensureUPlot() {
      if ((window as any).uPlot) { setReady(true); return; }
      cssEl = document.createElement('link');
      cssEl.rel = 'stylesheet';
      cssEl.href = 'https://cdn.jsdelivr.net/npm/uplot@1.6.30/dist/uPlot.min.css';
      document.head.appendChild(cssEl);
      jsEl = document.createElement('script');
      jsEl.src = 'https://cdn.jsdelivr.net/npm/uplot@1.6.30/dist/uPlot.iife.min.js';
      jsEl.async = true;
      jsEl.onload = () => setReady(true);
      document.body.appendChild(jsEl);
    }
    ensureUPlot();
    return () => {
      if (plotRef.current) { plotRef.current.destroy(); plotRef.current = null; }
      if (jsEl && jsEl.parentNode) jsEl.parentNode.removeChild(jsEl);
      if (cssEl && cssEl.parentNode) cssEl.parentNode.removeChild(cssEl);
    };
  }, []);

  useEffect(() => {
    if (!ready || !plotContainerRef.current) return;
    const uPlot = (window as any).uPlot;
    if (!uPlot) return;
    if (plotRef.current) { plotRef.current.destroy(); plotRef.current = null; }

    const xs = labels.map((_, i) => i);
    const series = [xs, ySeries];

    const steppedPath = (uPlot?.paths?.stepped ? uPlot.paths.stepped({ align: 1 }) : null);
    const isPoints = lineType === 'points';
    const isStep = lineType === 'step';

    const seriesCfg: any = {
      stroke: isPoints ? 'transparent' : '#1976d2',
      width: isPoints ? 0 : 1.5,
      fill: isPoints || isStep ? 'transparent' : 'rgba(25,118,210,0.15)',
      points: { show: isPoints, size: 2.5, stroke: '#1976d2', fill: '#1976d2' },
      paths: isStep && steppedPath ? steppedPath : undefined,
    };

    const opts = {
      width: plotContainerRef.current.clientWidth || 600,
      height,
      series: [ {}, seriesCfg ],
      axes: [ { grid: { show: true } }, { values: (u: any, vals: any[]) => vals.map((v) => String(v)) } ],
    } as any;

    plotRef.current = new uPlot(opts, series, plotContainerRef.current);

    function handleResize() {
      const w = plotContainerRef.current?.clientWidth || 600;
      plotRef.current.setSize({ width: w, height });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [ready, JSON.stringify(labels), JSON.stringify(ySeries), height, lineType]);

  async function handleExportPNG() {
    const root = plotContainerRef.current;
    const plot = plotRef.current;
    if (!root || !plot) return;

    const wCss = root.clientWidth || 600;
    const hCss = height;
    const dpi = Math.max(72, Math.min(600, Number(exportDPI) || 96));
    const scale = Math.max(1, dpi / 96);

    const original = { width: wCss, height: hCss };
    if (scale !== 1) {
      plot.setSize({ width: Math.round(wCss * scale), height: Math.round(hCss * scale) });
      await new Promise((r) => setTimeout(r, 30));
    }

    const canvases = Array.from(root.querySelectorAll('canvas')) as HTMLCanvasElement[];
    if (!canvases.length) {
      if (scale !== 1) plot.setSize(original);
      return;
    }
    const base = canvases[0];

    const out = document.createElement('canvas');
    out.width = base.width;
    out.height = base.height;
    const ctx = out.getContext('2d');
    if (!ctx) {
      if (scale !== 1) plot.setSize(original);
      return;
    }

    if (!exportTransparent) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
    }

    for (const c of canvases) ctx.drawImage(c, 0, 0);

    try {
      const url = out.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      const name = (exportFilename?.trim() || 'uplot').replace(/\.(png|jpg|jpeg)$/i, '');
      a.download = `${name}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {}

    if (scale !== 1) {
      plot.setSize(original);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
        <FormControlLabel control={<Switch checked={logScale} onChange={(e)=> setLogScale(e.target.checked)} size="small" />} label="Log skala" />
        <Select size="small" value={lineType} onChange={(e)=> setLineType(e.target.value as LineType)}>
          <MenuItem value="line">Linje</MenuItem>
          <MenuItem value="step">Steg</MenuItem>
          <MenuItem value="points">Punkter</MenuItem>
        </Select>
        <TextField size="small" label="Filnavn" value={exportFilename} onChange={(e)=> setExportFilename(e.target.value)} sx={{ width: 160 }} />
        <TextField size="small" type="number" label="DPI (72–600)" value={exportDPI} onChange={(e)=> setExportDPI(Math.max(72, Math.min(600, Number(e.target.value)||96)))} sx={{ width: 140 }} />
        <FormControlLabel control={<Switch checked={exportTransparent} onChange={(e)=> setExportTransparent(e.target.checked)} size="small" />} label="Transparent" />
        <Button size="small" variant="outlined" onClick={handleExportPNG}>Eksporter PNG</Button>
        <Box sx={{ ml: 'auto', fontSize: 12, color: 'text.secondary' }}>Y: {logScale ? 'log10' : 'lineær'}</Box>
      </Stack>
      <Box sx={{ position: 'relative' }}>
        {logScale && (
          <Box sx={{ position: 'absolute', left: 0, top: '50%', transform: 'translate(-4px, -50%) rotate(-90deg)', transformOrigin: 'left top', fontSize: 10, color: 'text.secondary', pointerEvents: 'none' }}>
            log10(y)
          </Box>
        )}
        <div ref={plotContainerRef} style={{ width: '100%', height }} />
      </Box>
    </Box>
  );
}
