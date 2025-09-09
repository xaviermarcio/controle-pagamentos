// public/js/ui.js
export function cssVar(name, fallback){
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch { return fallback; }
}

export function applyTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem("theme", theme); } catch {}
}

export function initThemeSwitch(){
  const sw = document.getElementById("themeSwitch");
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  applyTheme(theme);
  if (sw){
    sw.checked = theme === "dark";
    sw.addEventListener("change", () => applyTheme(sw.checked ? "dark" : "light"));
  }
}

// Chart.js plugins
let registered = false;
export function registerChartPlugins(){
  if (!window.Chart || registered) return;
  if (window.ChartDataLabels) Chart.register(window.ChartDataLabels);

  const centerTextPlugin = {
    id: 'centerText',
    afterDatasetsDraw(chart, args, pluginOptions) {
      if (!pluginOptions || !pluginOptions.text) return;
      const {ctx} = chart;
      const meta = chart.getDatasetMeta(0);
      const first = meta?.data?.[0]; if (!first) return;
      const x = first.x, y = first.y;
      ctx.save();
      const color = getComputedStyle(document.documentElement).getPropertyValue('--bs-body-color') || '#333';
      ctx.fillStyle = (color.trim() || '#333');
      ctx.font = '600 13px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pluginOptions.text, x, y);
      ctx.restore();
    }
  };
  Chart.register(centerTextPlugin);
  registered = true;
}
