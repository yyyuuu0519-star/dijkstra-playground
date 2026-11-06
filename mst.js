const levels = {
  campus: {
    name: "校園地圖", algorithm: "kruskal",
    nodes: [
      { id: "A", name: "校門", x: 150, y: 215 }, { id: "B", name: "圖書館", x: 315, y: 95 },
      { id: "C", name: "餐廳", x: 315, y: 345 }, { id: "D", name: "系館", x: 515, y: 95 },
      { id: "E", name: "宿舍", x: 515, y: 345 }, { id: "F", name: "體育館", x: 690, y: 215 }
    ],
    edges: [["A", "B", 4], ["A", "C", 2], ["B", "C", 1], ["B", "D", 5], ["C", "D", 8], ["C", "E", 10], ["D", "E", 2], ["D", "F", 6], ["E", "F", 3]]
  },
  primA: { algorithm: "prim", start: "A", sameAs: "campus" },
  primF: { algorithm: "prim", start: "F", sameAs: "campus" },
  tie: {
    name: "平手：兩棵都最小", algorithm: "kruskal",
    nodes: [
      { id: "A", name: "北門", x: 150, y: 215 }, { id: "B", name: "教室", x: 330, y: 95 },
      { id: "C", name: "實驗室", x: 330, y: 335 }, { id: "D", name: "操場", x: 530, y: 95 },
      { id: "E", name: "宿舍", x: 530, y: 335 }, { id: "F", name: "南門", x: 690, y: 215 }
    ],
    edges: [["A", "B", 1], ["A", "C", 1], ["B", "D", 1], ["C", "E", 1], ["D", "F", 2], ["E", "F", 2], ["B", "C", 2], ["D", "E", 2]]
  },
  cycles: {
    name: "成環：一直成環", algorithm: "kruskal",
    nodes: [
      { id: "A", name: "入口", x: 150, y: 215 }, { id: "B", name: "教室", x: 315, y: 95 },
      { id: "C", name: "圖書館", x: 315, y: 345 }, { id: "D", name: "中庭", x: 515, y: 95 },
      { id: "E", name: "餐廳", x: 515, y: 345 }, { id: "F", name: "出口", x: 690, y: 215 }
    ],
    edges: [["A", "B", 1], ["A", "C", 2], ["B", "C", 3], ["B", "D", 4], ["C", "D", 5], ["C", "E", 6], ["D", "E", 7], ["D", "F", 8], ["E", "F", 9]]
  },
  forest: {
    name: "不連通的圖", algorithm: "kruskal",
    nodes: [
      { id: "A", name: "校門", x: 140, y: 145 }, { id: "B", name: "圖書館", x: 320, y: 90 },
      { id: "C", name: "餐廳", x: 320, y: 260 }, { id: "D", name: "系館", x: 510, y: 145 },
      { id: "E", name: "宿舍", x: 680, y: 90 }, { id: "F", name: "體育館", x: 680, y: 260 }
    ],
    edges: [["A", "B", 2], ["B", "C", 1], ["A", "C", 4], ["D", "E", 1], ["E", "F", 2], ["D", "F", 4]]
  }
};

const colors = ["#4c91b0", "#8e79b9", "#bd7951", "#4d9b7a", "#b06d8b", "#9d914e"];
const state = { level: "campus", mode: "demo", trace: [], index: 0, timer: null, score: 0, answered: false, challengeValue: null };
const $ = (selector) => document.querySelector(selector);
const svg = $("#mst-svg");

function getLevel() {
  const selected = levels[state.level];
  if (!selected.sameAs) return selected;
  return { ...levels[selected.sameAs], ...selected, name: levels[selected.sameAs].name };
}

function find(parent, value) {
  while (parent[value] !== value) value = parent[value];
  return value;
}

function copyFrame(context, tag, title, detail, extra = {}) {
  return {
    tag, title, detail, currentEdge: null, outcome: null,
    parent: { ...context.parent }, accepted: [...context.accepted], skipped: [...context.skipped],
    visited: [...context.visited], queue: context.queue.map((edge) => edge.id),
    checked: context.checked, weight: context.weight, components: context.components,
    ...extra
  };
}

function buildKruskalTrace(graph) {
  const parent = Object.fromEntries(graph.nodes.map(({ id }) => [id, id]));
  const context = { parent, accepted: [], skipped: [], visited: [], queue: [], checked: 0, weight: 0, components: graph.nodes.length };
  const trace = [copyFrame(context, "START", "原本的圖：還沒挑任何邊", `${graph.nodes.length} 棟建築要鋪網路，總長度要最短。Kruskal：把 ${graph.edges.length} 條邊由短到長排序，一條一條看；兩端已經連通（會成環）的就跳過。`)];
  const sorted = graph.edges.map((edge, order) => ({ id: order, a: edge[0], b: edge[1], weight: edge[2], order })).sort((a, b) => a.weight - b.weight || a.order - b.order);

  for (const [sortedIndex, edge] of sorted.entries()) {
    const rootA = find(context.parent, edge.a);
    const rootB = find(context.parent, edge.b);
    const accept = rootA !== rootB;
    context.checked += 1;
    context.queue = sorted.slice(sortedIndex + 1);
    trace.push(copyFrame(context, "CHECK", `看邊 ${edge.a}—${edge.b}（權重 ${edge.weight}）`, accept
      ? `find(${edge.a}) 和 find(${edge.b}) 找到不同的老大，兩端目前不連通。收下這條邊不會形成環。`
      : `find(${edge.a}) 和 find(${edge.b}) 找到同一個老大；兩端早已連通，收下就會形成環，應該跳過。`,
    { currentEdge: edge.id, outcome: accept ? "accept" : "skip" }));
    if (accept) {
      context.parent[rootB] = rootA;
      context.accepted.push(edge.id);
      context.weight += edge.weight;
      context.components -= 1;
      trace.push(copyFrame(context, "ACCEPT", `收下 ${edge.a}—${edge.b}：兩組合併`, `union(${edge.a}, ${edge.b})：把代表 ${rootB} 接到 ${rootA}。現在已收 ${context.accepted.length} 條邊，總重 ${context.weight}，還有 ${context.components} 組。`, { currentEdge: edge.id, outcome: "accept" }));
    } else {
      context.skipped.push(edge.id);
      trace.push(copyFrame(context, "SKIP", `跳過 ${edge.a}—${edge.b}：會形成環`, `兩端代表相同，不改變併查集。最小生成樹不可以有環。`, { currentEdge: edge.id, outcome: "skip" }));
    }
  }
  const isForest = context.components > 1;
  trace.push(copyFrame(context, "DONE", isForest ? `完成最小生成森林：${context.components} 個連通分量` : `完成最小生成樹：${context.accepted.length} 條邊，總重 ${context.weight}`,
    isForest
      ? `原圖不連通，因此不存在涵蓋所有頂點的一棵生成樹。每個連通分量各自取最小生成樹，合起來是最小生成森林；總重 ${context.weight}。`
      : `所有頂點都連在一起，且沒有環。${graph.nodes.length} 個頂點正好收下 ${graph.nodes.length - 1} 條邊，總重 ${context.weight}。`));
  return trace;
}

function buildPrimTrace(graph, start) {
  const context = { parent: Object.fromEntries(graph.nodes.map(({ id }) => [id, id])), accepted: [], skipped: [], visited: [start], queue: [], checked: 0, weight: 0, components: graph.nodes.length - 1 };
  const trace = [copyFrame(context, "START", `Prim 從 ${start} 開始長樹`, `先把 ${start} 放進樹裡，再從所有跨出目前樹的邊中，挑權重最小的一條。每次只接一個新頂點，因此不會形成環。`, { activeNode: start })];
  const pushCrossing = (node) => {
    for (let order = 0; order < graph.edges.length; order += 1) {
      const [a, b, weight] = graph.edges[order];
      if (a !== node && b !== node) continue;
      const other = a === node ? b : a;
      if (context.visited.includes(other)) continue;
      if (!context.queue.some((edge) => edge.id === order)) context.queue.push({ id: order, a, b, weight, order });
    }
  };
  pushCrossing(start);
  while (context.queue.length) {
    context.queue.sort((a, b) => a.weight - b.weight || a.order - b.order);
    const edge = context.queue.shift();
    const aIn = context.visited.includes(edge.a);
    const bIn = context.visited.includes(edge.b);
    context.checked += 1;
    if (aIn && bIn) {
      context.skipped.push(edge.id);
      trace.push(copyFrame(context, "SKIP", `跳過 ${edge.a}—${edge.b}：兩端都已在樹裡`, "這是佇列裡留下的舊邊，現在兩端都已經在樹中；再收下會形成環。", { currentEdge: edge.id, outcome: "skip", activeNode: null }));
      continue;
    }
    const newNode = aIn ? edge.b : edge.a;
    trace.push(copyFrame(context, "CHECK", `看候選邊 ${edge.a}—${edge.b}（權重 ${edge.weight}）`, `這是目前所有跨出樹的候選邊中最便宜的一條，接上 ${newNode} 後仍不會形成環。`, { currentEdge: edge.id, outcome: "accept", activeNode: newNode }));
    context.accepted.push(edge.id);
    context.weight += edge.weight;
    context.visited.push(newNode);
    context.components -= 1;
    pushCrossing(newNode);
    trace.push(copyFrame(context, "ACCEPT", `收下 ${edge.a}—${edge.b}：${newNode} 加入樹`, `樹現在包含 ${context.visited.join("、")}。總重 ${context.weight}；再從新的邊界找最便宜的邊。`, { currentEdge: edge.id, outcome: "accept", activeNode: newNode }));
  }
  trace.push(copyFrame(context, "DONE", `Prim 完成：${context.accepted.length} 條邊，總重 ${context.weight}`,
    `從 ${start} 長出去，所有建築都已接上。Prim 每次擴張同一棵樹；改變起點會改變收邊順序，但最小總重不變。`, { activeNode: null }));
  return trace;
}

function buildTrace() {
  const graph = getLevel();
  return graph.algorithm === "prim" ? buildPrimTrace(graph, graph.start) : buildKruskalTrace(graph);
}

function edgeState(frame, id) {
  if (frame.accepted.includes(id)) return "accepted";
  if (frame.skipped.includes(id)) return "rejected";
  if (frame.currentEdge === id) return frame.tag === "CHECK" ? "inspecting" : frame.outcome === "skip" ? "rejected" : "accepted";
  return "";
}

function renderGraph(frame) {
  const graph = getLevel();
  const nodeById = Object.fromEntries(graph.nodes.map((node) => [node.id, node]));
  const edgeMarkup = graph.edges.map(([a, b, weight], id) => {
    const first = nodeById[a];
    const second = nodeById[b];
    const status = edgeState(frame, id);
    const labelX = (first.x + second.x) / 2;
    const labelY = (first.y + second.y) / 2 - 9;
    return `<g><line class="edge-line ${status}" x1="${first.x}" y1="${first.y}" x2="${second.x}" y2="${second.y}"/><rect class="edge-label-bg" x="${labelX - 12}" y="${labelY - 10}" width="24" height="20" rx="5"/><text class="edge-weight" x="${labelX}" y="${labelY}">${weight}</text></g>`;
  }).join("");
  const nodeMarkup = graph.nodes.map((node) => {
    const inTree = graph.algorithm === "prim" && frame.visited.includes(node.id);
    const active = frame.activeNode === node.id;
    const component = frame.parent[node.id] ? find(frame.parent, node.id) : node.id;
    const colorIndex = graph.nodes.findIndex(({ id }) => id === component) % colors.length;
    const style = graph.algorithm === "kruskal" ? `style="--component-color:${colors[colorIndex]}"` : "";
    const algorithmClass = graph.algorithm === "kruskal" ? " kruskal-node" : " prim-node";
    return `<g class="node-group${algorithmClass}${inTree ? " in-tree" : ""}${active ? " active-node" : ""}" ${style}><circle class="node-circle" cx="${node.x}" cy="${node.y}" r="23"/><text class="node-label" x="${node.x}" y="${node.y}">${node.id}</text><text class="node-caption" x="${node.x}" y="${node.y - 36}">${node.name}</text></g>`;
  }).join("");
  svg.innerHTML = `${edgeMarkup}${nodeMarkup}`;
  $("#map-heading").textContent = graph.algorithm === "kruskal" ? "地圖 + KRUSKAL 的資料" : `地圖 + PRIM 從 ${graph.start} 開始`;
  $("#sort-label").textContent = graph.algorithm === "kruskal"
    ? frame.checked === 0 ? "還沒排序" : "由小到大排序"
    : "優先佇列";
  $("#algorithm-label").textContent = graph.algorithm === "kruskal" ? "Kruskal" : `Prim · ${graph.start}`;
  $("#edge-list-title").textContent = graph.algorithm === "kruskal" ? "EDGES · 輸入的順序（排序由演算法進行）" : "CANDIDATES · 優先佇列（權重由小到大）";
  renderEdgeList(frame, graph);
  renderSetTable(frame, graph);
}

function renderEdgeList(frame, graph) {
  let entries = graph.edges.map((edge, id) => ({ id, a: edge[0], b: edge[1], weight: edge[2], order: id }));
  if (graph.algorithm === "prim") {
    const queued = new Map(frame.queue.map((id) => [id, id]));
    entries = frame.queue.map((id) => ({ ...entries[id] })).sort((a, b) => a.weight - b.weight || a.order - b.order);
    if (frame.currentEdge !== null && !entries.some(({ id }) => id === frame.currentEdge) && frame.tag !== "START") {
      const current = graph.edges[frame.currentEdge];
      entries.unshift({ id: frame.currentEdge, a: current[0], b: current[1], weight: current[2] });
    }
    if (frame.tag === "DONE" && !entries.length) $("#edge-count").textContent = "0 條目";
    else $("#edge-count").textContent = `${queued.size} 條目`;
  } else {
    if (frame.checked > 0) entries.sort((a, b) => a.weight - b.weight || a.order - b.order);
    $("#edge-list-title").textContent = frame.checked === 0
      ? "EDGES · 輸入的順序（還沒排序）"
      : "EDGES · 權重排序（從小到大）";
    $("#edge-count").textContent = `${entries.length} 條`;
  }
  $("#edge-list").innerHTML = entries.length
    ? entries.map(({ id, a, b, weight }) => `<li class="edge-row ${edgeState(frame, id)}"><span>${a}—${b}</span><span class="weight">${weight}</span></li>`).join("")
    : '<li class="table-note">目前沒有待檢查的邊。</li>';
}

function renderSetTable(frame, graph) {
  const isPrim = graph.algorithm === "prim";
  $("#set-title").textContent = isPrim ? "PRIM · 節點是否已在樹裡" : "UNION-FIND · p[x]（同色＝同一組）";
  $("#set-head").innerHTML = `<tr><th>點</th><th>${isPrim ? "IN TREE" : "PARENT"}</th><th>代表</th></tr>`;
  $("#set-body").innerHTML = graph.nodes.map(({ id }) => {
    const root = find(frame.parent, id);
    const membership = isPrim ? (frame.visited.includes(id) ? "已在樹裡" : "未加入") : frame.parent[id];
    const rootColor = colors[graph.nodes.findIndex((node) => node.id === root) % colors.length];
    return `<tr><td>${id}</td><td>${membership}</td><td style="color:${rootColor}">${root}</td></tr>`;
  }).join("");
  $("#set-note").textContent = isPrim
    ? "Prim 不需要併查集；每次只接到一個新頂點。"
    : `${frame.components} 個連通分量 · p[x] 初始指向自己；find 找代表，union 合併兩組。`;
}

function renderHistory(frame) {
  const history = state.trace.slice(1, state.index + 1).filter(({ tag }) => tag === "ACCEPT" || tag === "SKIP");
  $("#history-list").innerHTML = history.length
    ? history.map((entry, index) => `<li class="${entry.tag === "ACCEPT" ? "accepted" : "rejected"}"><span>${String(index + 1).padStart(2, "0")}</span><span>${entry.tag === "ACCEPT" ? "收下" : "跳過"} ${entry.title.replace(/^(收下|跳過) /, "").split("：")[0]}</span></li>`).join("")
    : '<li class="empty-history">還沒開始。</li>';
  $("#history-list").scrollTop = $("#history-list").scrollHeight;
}

function answerChallenge(value, frame) {
  if (state.answered) return;
  state.answered = true;
  state.challengeValue = value;
  const correct = value === frame.outcome;
  if (correct) state.score += 1;
  const explanation = frame.outcome === "accept" ? "收下：兩端目前不連通。" : "跳過：兩端已連通，會形成環。";
  $("#challenge-feedback").textContent = `${correct ? "答對！" : "再記住這個判斷。"} ${explanation} · 得分 ${state.score}`;
  $("#challenge-options").querySelectorAll("button").forEach((button) => {
    button.disabled = true;
    if (button.dataset.answer === frame.outcome) button.classList.add("correct");
    else if (button.dataset.answer === value) button.classList.add("incorrect");
  });
  $("#next-button").disabled = false;
}

function renderChallenge(frame) {
  const panel = $("#challenge-card");
  panel.hidden = state.mode !== "challenge";
  if (state.mode !== "challenge") return;
  const isQuestion = frame.tag === "CHECK";
  const edge = isQuestion ? getLevel().edges[frame.currentEdge] : null;
  $("#challenge-prompt").textContent = isQuestion
    ? `邊 ${edge[0]}—${edge[1]}（權重 ${edge[2]}）會被收下，還是因為成環跳過？`
    : `目前進度：已收 ${frame.accepted.length} 條邊，總重 ${frame.weight}。`;
  $("#challenge-options").innerHTML = isQuestion
    ? '<button class="challenge-option" type="button" data-answer="accept">收下</button><button class="challenge-option" type="button" data-answer="skip">成環跳過</button>'
    : '<span class="table-note">按「下一步」繼續。</span>';
  $("#challenge-options").querySelectorAll("button").forEach((button) => button.addEventListener("click", () => answerChallenge(button.dataset.answer, frame)));
  if (!state.answered) $("#challenge-feedback").textContent = `得分 ${state.score}`;
}

function render() {
  const frame = state.trace[state.index];
  const graph = getLevel();
  renderGraph(frame);
  renderHistory(frame);
  $("#step-tag").textContent = frame.tag;
  $("#step-title").textContent = frame.title;
  $("#step-detail").textContent = frame.detail;
  $("#stat-accepted").textContent = frame.accepted.length;
  $("#stat-target").textContent = graph.nodes.length - countGraphComponents(graph);
  $("#stat-weight").textContent = frame.weight;
  $("#stat-checked").textContent = frame.checked;
  $("#stat-skipped").textContent = frame.skipped.length;
  $("#prev-button").disabled = state.index === 0;
  $("#next-button").disabled = state.index === state.trace.length - 1 || (state.mode === "challenge" && frame.tag === "CHECK" && !state.answered);
  const progress = state.trace.length > 1 ? (state.index / (state.trace.length - 1)) * 100 : 0;
  $(".progress-track").setAttribute("aria-valuenow", String(Math.round(progress)));
  $("#progress-fill").style.width = `${progress}%`;
  $("#progress-count").textContent = `${state.index} / ${state.trace.length - 1}`;
  renderChallenge(frame);
}

function countGraphComponents(graph) {
  const parent = Object.fromEntries(graph.nodes.map(({ id }) => [id, id]));
  for (const [a, b] of graph.edges) {
    const rootA = find(parent, a);
    const rootB = find(parent, b);
    if (rootA !== rootB) parent[rootB] = rootA;
  }
  return new Set(graph.nodes.map(({ id }) => find(parent, id))).size;
}

function stopPlayback() {
  if (state.timer) {
    window.clearInterval(state.timer);
    state.timer = null;
  }
  $("#play-icon").textContent = "▶";
  $("#play-label").textContent = "自動播放";
}

function advance() {
  if (state.index >= state.trace.length - 1) {
    stopPlayback();
    return;
  }
  if (state.mode === "challenge" && state.trace[state.index].tag === "CHECK" && !state.answered) return;
  state.index += 1;
  state.answered = false;
  state.challengeValue = null;
  $("#challenge-feedback").textContent = "";
  render();
}

function reset() {
  stopPlayback();
  state.trace = buildTrace();
  state.index = 0;
  state.answered = false;
  state.challengeValue = null;
  $("#challenge-feedback").textContent = "";
  render();
}

function setMode(mode) {
  stopPlayback();
  state.mode = mode;
  state.answered = false;
  $("#demo-mode").classList.toggle("active", mode === "demo");
  $("#challenge-mode").classList.toggle("active", mode === "challenge");
  $("#demo-mode").setAttribute("aria-pressed", String(mode === "demo"));
  $("#challenge-mode").setAttribute("aria-pressed", String(mode === "challenge"));
  render();
}

document.querySelectorAll(".graph-tab").forEach((button) => {
  button.addEventListener("click", () => {
    state.level = button.dataset.level;
    document.querySelectorAll(".graph-tab").forEach((tab) => {
      const selected = tab === button;
      tab.classList.toggle("selected", selected);
      tab.setAttribute("aria-pressed", String(selected));
    });
    reset();
  });
});

$("#next-button").addEventListener("click", advance);
$("#prev-button").addEventListener("click", () => {
  if (state.index === 0) return;
  state.index -= 1;
  state.answered = false;
  state.challengeValue = null;
  $("#challenge-feedback").textContent = "";
  render();
});
$("#reset-button").addEventListener("click", reset);
$("#play-button").addEventListener("click", () => {
  if (state.timer) {
    stopPlayback();
    return;
  }
  if (state.mode === "challenge") return;
  if (state.index === state.trace.length - 1) state.index = 0;
  $("#play-icon").textContent = "Ⅱ";
  $("#play-label").textContent = "暫停";
  state.timer = window.setInterval(advance, 1150);
  advance();
});
$("#demo-mode").addEventListener("click", () => setMode("demo"));
$("#challenge-mode").addEventListener("click", () => setMode("challenge"));
document.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return;
  if (event.key === "ArrowRight") {
    event.preventDefault();
    if (!$("#next-button").disabled) advance();
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    if (!$("#prev-button").disabled) $("#prev-button").click();
  } else if (event.code === "Space" && state.mode === "demo") {
    event.preventDefault();
    $("#play-button").click();
  }
});

reset();
