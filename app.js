const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const runBtn = document.getElementById("runBtn");
const exportBtn = document.getElementById("exportBtn");
const dedupeEl = document.getElementById("dedupe");
const fillBlankEl = document.getElementById("fillBlank");
const statusEl = document.getElementById("status");
const tableWrap = document.getElementById("tableWrap");
const chartEl = document.getElementById("chart");

let rawRows = [];
let cleanedRows = [];
let cleanedHeaders = [];
let currentLoadToken = 0;
const FORMULA_PREFIX_RE = /^[\u0000-\u001f\u007f\s]*[=+\-@]/;
let chart = null;

function setStatus(text) {
  statusEl.textContent = `状态: ${text}`;
}

function ensurePapa(featureName) {
  const ok = !!(window.Papa && typeof window.Papa.parse === "function" && typeof window.Papa.unparse === "function");
  if (ok) return true;
  setStatus(`依赖未加载：PapaParse（${featureName}不可用）。可能网络不可用或 CDN 被拦截。`);
  return false;
}

function ensureECharts() {
  if (chart) return chart;
  if (!chartEl) return null;
  if (!window.echarts || typeof window.echarts.init !== "function") return null;
  try {
    chart = window.echarts.init(chartEl);
    return chart;
  } catch (_e) {
    return null;
  }
}

function clearChart() {
  const c = ensureECharts();
  if (c) {
    c.clear();
    return;
  }
  if (chartEl) {
    chartEl.textContent = "图表依赖未加载（可能网络不可用），当前仅提供表格清洗与预览。";
  }
}

function readCsv(file) {
  return new Promise((resolve, reject) => {
    if (!ensurePapa("CSV 解析")) {
      reject(new Error("CSV 解析依赖未加载（PapaParse）"));
      return;
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        if (Array.isArray(results.errors) && results.errors.length > 0) {
          const first = results.errors[0];
          const row = Number.isFinite(first.row) ? first.row + 1 : "?";
          reject(new Error(`CSV 解析失败，第 ${row} 行: ${first.message}`));
          return;
        }
        resolve(results);
      },
      error: err => reject(err)
    });
  });
}

function cleanRows(rows, headers) {
  let out = [...rows];

  if (dedupeEl.checked) {
    const seen = new Set();
    out = out.filter(row => {
      const key = JSON.stringify(headers.map(h => row[h] ?? ""));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (fillBlankEl.checked) {
    const numericHeaders = headers.filter(h =>
      out.some(row => {
        const value = String(row[h] ?? "").trim();
        return value !== "" && !Number.isNaN(Number(value));
      })
    );

    out = out.map(row => {
      const cloned = { ...row };
      numericHeaders.forEach(h => {
        const v = (cloned[h] ?? "").toString().trim();
        if (!v) cloned[h] = "0";
      });
      return cloned;
    });
  }

  return out;
}

function escapeCsvFormula(value) {
  const text = String(value ?? "");
  if (FORMULA_PREFIX_RE.test(text)) {
    return `'${text}`;
  }
  return text;
}

function renderTable(headers, rows) {
  tableWrap.textContent = "";
  if (!headers.length || !rows.length) {
    const empty = document.createElement("p");
    empty.textContent = "暂无数据";
    tableWrap.appendChild(empty);
    return;
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = String(h ?? "");
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  rows.slice(0, 100).forEach(row => {
    const tr = document.createElement("tr");
    headers.forEach(h => {
      const td = document.createElement("td");
      td.textContent = String(row[h] ?? "");
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  tableWrap.appendChild(table);
}

function renderChart(headers, rows) {
  const c = ensureECharts();
  if (!c) {
    setStatus("图表依赖未加载（ECharts），已跳过图表渲染。");
    return;
  }
  if (!rows.length) return clearChart();
  const numericCol = headers.find(h => rows.some(r => !Number.isNaN(Number(r[h]))));
  const categoryCol = headers.find(h => h !== numericCol) || headers[0];
  if (!numericCol) {
    return clearChart();
  }
  const data = rows.slice(0, 20).map(r => ({
    name: String(r[categoryCol] ?? "N/A"),
    value: Number(r[numericCol]) || 0
  }));

  const paint = getComputedStyle(document.documentElement);
  const ink = paint.getPropertyValue("--ink").trim() || "#3A2E20";
  const accent = paint.getPropertyValue("--accent").trim() || "#A2402F";
  const line = paint.getPropertyValue("--line").trim() || "#D3C4A0";
  c.setOption({
    backgroundColor: "transparent",
    textStyle: { color: ink },
    title: {
      text: `预览图：${categoryCol} vs ${numericCol}`,
      textStyle: { color: ink, fontWeight: 600 }
    },
    tooltip: {},
    xAxis: {
      type: "category",
      data: data.map(d => d.name),
      axisLabel: { color: ink },
      axisLine: { lineStyle: { color: line } }
    },
    yAxis: {
      type: "value",
      axisLabel: { color: ink },
      splitLine: { lineStyle: { color: line } }
    },
    series: [{ type: "bar", data: data.map(d => d.value), itemStyle: { color: accent } }]
  });
}

function handleFile(file) {
  if (!file) return;
  const loadToken = ++currentLoadToken;
  cleanedRows = [];
  rawRows = [];
  cleanedHeaders = [];
  exportBtn.disabled = true;
  renderTable([], []);
  clearChart();
  setStatus(`读取文件: ${file.name}`);
  readCsv(file)
    .then(results => {
      if (loadToken !== currentLoadToken) return;
      rawRows = results.data || [];
      cleanedHeaders = results.meta.fields || Object.keys(rawRows[0] || {});
      setStatus(`读取完成，共 ${rawRows.length} 行`);
    })
    .catch(err => {
      if (loadToken !== currentLoadToken) return;
      setStatus(`读取失败: ${err.message}`);
    });
}

fileInput.addEventListener("change", e => handleFile(e.target.files?.[0]));

dropzone.addEventListener("dragover", e => {
  e.preventDefault();
  dropzone.classList.add("is-dragover");
});
dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("is-dragover");
});
dropzone.addEventListener("drop", e => {
  e.preventDefault();
  dropzone.classList.remove("is-dragover");
  handleFile(e.dataTransfer.files?.[0]);
});

runBtn.addEventListener("click", () => {
  if (!rawRows.length) {
    setStatus("请先上传 CSV");
    return;
  }
  cleanedRows = cleanRows(rawRows, cleanedHeaders);
  renderTable(cleanedHeaders, cleanedRows);
  renderChart(cleanedHeaders, cleanedRows);
  exportBtn.disabled = false;
  setStatus(`清洗完成：${rawRows.length} -> ${cleanedRows.length} 行`);
});

exportBtn.addEventListener("click", () => {
  if (!cleanedRows.length) {
    setStatus("暂无可导出数据");
    return;
  }
  if (!ensurePapa("CSV 导出")) return;
  const safeHeaders = cleanedHeaders.map(h => escapeCsvFormula(h));
  const safeData = cleanedRows.map(row => cleanedHeaders.map(h => escapeCsvFormula(row[h])));
  const csv = Papa.unparse({ fields: safeHeaders, data: safeData });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cleaned-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus("已导出清洗后的 CSV");
});

if (!window.echarts) {
  clearChart();
}

window.addEventListener("resize", () => {
  if (chart) chart.resize();
});

// === PM Metrics Integration ===
(function() {
  try {
    if (!window.pmMetrics) return;
    // Auto mark task start on first meaningful interaction
    let taskStarted = false;
    document.addEventListener('click', function(e) {
      if (taskStarted) return;
      const btn = e.target.closest('button');
      if (btn) {
        taskStarted = true;
        window.pmMetrics.markTaskStart('csv_clean_task');
      }
    }, { once: false });
  } catch (_e) {}
})();


// === Auto-load demo CSV ===
(function() {
  function injectDemoCSV() {
    var csvContent = 'Name,Age,City,Salary,Email\n张三,28,北京,15000,zhangsan@example.com\n李四,,上海,18000,lisi@test.com\n王五,35,广州,,wangwu@mail.com\n张三,28,北京,15000,zhangsan@example.com\n赵六,42,深圳,25000,\n"孙七",29,"杭州",12000,sunqi@demo.cn\n周八,-5,成都,9999999,bad-email\n吴九,31, 南京 ,16000,wujiu@test.com\n郑十,abc,武汉,14000,zhengshi@mail.com\n';
    var blob = new Blob([csvContent], {type: 'text/csv'});
    var file = new File([blob], 'demo_dirty_data.csv', {type: 'text/csv'});
    var input = document.querySelector('input[type="file"]');
    if (!input) return;
    var dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', {bubbles: true}));
  }
  // Add demo button
  var demoBtn = document.createElement('button');
  demoBtn.type = 'button';
  demoBtn.className = 'example-btn';
  demoBtn.textContent = '加载示例脏数据';
  demoBtn.onclick = injectDemoCSV;
  var fileInput = document.querySelector('input[type="file"]');
  var zone = fileInput && fileInput.closest("#dropzone");
  if (zone && zone.parentNode) zone.parentNode.insertBefore(demoBtn, zone.nextSibling);
})();
