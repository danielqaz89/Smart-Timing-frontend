"use client";
import { useEffect, useRef, useState } from "react";

export default function EChartsLine({ labels, data, height = 420 }: { labels: string[]; data: number[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let scriptEl: HTMLScriptElement | null = null;
    let glEl: HTMLScriptElement | null = null;
    function ensureECharts() {
      if ((window as any).echarts) { setReady(true); return; }
      scriptEl = document.createElement('script');
      scriptEl.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js';
      scriptEl.async = true;
      scriptEl.onload = () => {
        glEl = document.createElement('script');
        glEl.src = 'https://cdn.jsdelivr.net/npm/echarts-gl@2/dist/echarts-gl.min.js';
        glEl.async = true;
        glEl.onload = () => setReady(true);
        glEl.onerror = () => setReady(true);
        document.head.appendChild(glEl);
      };
      document.head.appendChild(scriptEl);
    }
    ensureECharts();
    return () => {
      if (glEl && glEl.parentNode) glEl.parentNode.removeChild(glEl);
      if (scriptEl && scriptEl.parentNode) scriptEl.parentNode.removeChild(scriptEl);
    };
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current) return;
    const echarts = (window as any).echarts;
    if (chartRef.current) { chartRef.current.dispose(); chartRef.current = null; }
    const el = containerRef.current;
    const chart = echarts.init(el, undefined, { renderer: 'canvas' });
    chartRef.current = chart;

    const seriesData = labels.map((x, i) => [x, Number(data[i] || 0)]);

    const useGL = seriesData.length > 20000 && !!(window as any).echarts?.graphic;
    const series = useGL ? [{
      type: 'scatterGL',
      name: 'Aktive brukere',
      symbolSize: 2,
      large: true,
      data: seriesData,
    }] : [{
      type: 'line',
      name: 'Aktive brukere',
      showSymbol: false,
      sampling: 'lttb',
      large: seriesData.length > 10000,
      progressive: 5000,
      progressiveThreshold: 10000,
      lineStyle: { width: 1.5, color: '#1976d2' },
      areaStyle: { color: 'rgba(25,118,210,0.15)' },
      data: seriesData,
    }];

    chart.setOption({
      animation: false,
      tooltip: { trigger: 'axis' },
      grid: { left: 36, right: 18, top: 24, bottom: 36 },
      dataZoom: [ { type: 'inside', throttle: 50 }, { type: 'slider', height: 20 } ],
      xAxis: { type: 'category', boundaryGap: false },
      yAxis: { type: 'value', min: 0 },
      series,
    });

    function handleResize() { chart.resize(); }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) { chartRef.current.dispose(); chartRef.current = null; }
    };
  }, [ready, JSON.stringify(labels), JSON.stringify(data)]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}
