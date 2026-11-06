const graphs = {
  lesson: {
    name: "教學小圖",
    nodes: [
      { id: "A", x: 120, y: 205 }, { id: "B", x: 280, y: 92 },
      { id: "C", x: 280, y: 330 }, { id: "D", x: 475, y: 92 },
      { id: "E", x: 475, y: 330 }, { id: "F", x: 650, y: 205 }
    ],
    edges: [["A", "B", 2], ["A", "C", 5], ["B", "C", 1], ["B", "D", 4], ["C", "E", 2], ["D", "E", 1], ["D", "F", 3], ["E", "F", 6]]
  },
  trap: {
    name: "BFS 陷阱圖",
    nodes: [
      { id: "A", x: 100, y: 205 }, { id: "B", x: 260, y: 92 },
      { id: "C", x: 260, y: 318 }, { id: "D", x: 455, y: 318 },
      { id: "E", x: 455, y: 92 }, { id: "F", x: 650, y: 205 }
    ],
    edges: [["A", "B", 1], ["A", "F", 12], ["A", "C", 2], ["C", "D", 1], ["D", "F", 1], ["B", "E", 10], ["E", "F", 2]]
  },
  city: {
    name: "城市路網",
    nodes: [
      { id: "A", x: 100, y: 90 }, { id: "B", x: 280, y: 80 }, { id: "C", x: 475, y: 90 },
      { id: "D", x: 660, y: 95 }, { id: "E", x: 90, y: 215 }, { id: "F", x: 285, y: 210 },
      { id: "G", x: 485, y: 215 }, { id: "H", x: 675, y: 220 }, { id: "I", x: 380, y: 345 }
    ],
    edges: [["A", "B", 4], ["B", "C", 3], ["C", "D", 6], ["A", "E", 2], ["B", "F", 5], ["C", "G", 2], ["D", "H", 3], ["E", "F", 2], ["F", "G", 1], ["G", "H", 4], ["E", "I", 7], ["F", "I", 3], ["G", "I", 2]]
  }
};

const state = {
  graphKey: "lesson",
  start: "A",
  end: "F",
  mode: "demo",
  trace: [],
  index: 0,
  timer: null,
  challengeAnswered: false,
  score: 0,
  streak: 0
};

const $ = (selector) => document.querySelector(selector);
const svg = $("#graph-svg");

function getGraph() {
  return graphs[state.graphKey];
}

function edgeKey(a, b) {
  return [a, b].sort().join("-");
}

function buildTrace() {
  const graph = getGraph();
  const distances = Object.fromEntries(graph.nodes.map(({ id }) => [id, Infinity]));
  const parents = Object.fromEntries(graph.nodes.map(({ id }) => [id, null]));
  const settled = [];
  const queue = [{ node: state.start, distance: 0 }];
  const events = [];
  let pops = 0;
  let stale = 0;
  let relaxations = 0;
  let activeNode = null;
  let activeEdge = null;
  let finalPath = [];

  distances[state.start] = 0;
  const snapshot = (tag, title, detail) => ({
    distances: { ...distances },
    parents: { ...parents },
    settled: [...settled],
    queue: queue.map((item) => ({ ...item })),
    pops, stale, relaxations, activeNode, activeEdge,
    finalPath: [...finalPath], tag, title, detail
  });
  events.push(snapshot("START", `初始化：dist[${state.start}] = 0 · 其他全部 ∞`, `把第一張票 (${state.start === "A" ? "0, A" : `0, ${state.start}`}) 放進優先佇列。∞ 的意思是「還完全不知道怎麼去」。目標：找出到 ${state.end} 的最快走法。`));

  while (queue.length) {
    queue.sort((a, b) => a.distance - b.distance || a.node.localeCompare(b.node));
    const item = queue.shift();
    pops += 1;
    activeNode = item.node;
    activeEdge = null;
    const isStale = item.distance > distances[item.node] || settled.includes(item.node);
    if (isStale) {
      stale += 1;
      events.push(snapshot("STALE", `取出 (${item.distance}, ${item.node})，發現這張票已過期`, `現在 ${item.node} 的最佳距離已是 ${distances[item.node]}，這張舊票比較差，不更新任何東西，直接跳過。這就是 lazy deletion。`));
      activeNode = null;
      continue;
    }

    settled.push(item.node);
    events.push(snapshot("POP", `取出 (${item.distance}, ${item.node})：目前最小，距離定案`, `佇列中有效距離最小的是 ${item.node}。非負權重保證不可能再找到更短的路，因此 dist[${item.node}] = ${item.distance} 從此定案。`));
    if (item.node === state.end) {
      const path = [];
      let cursor = state.end;
      while (cursor) {
        path.unshift(cursor);
        cursor = parents[cursor];
      }
      finalPath = path;
      activeEdge = null;
      events.push(snapshot("DONE", `抵達終點 ${state.end}！最短距離是 ${distances[state.end]}`, `最短路徑：${path.join(" → ")}，總權重 ${distances[state.end]}。目標節點定案後即可停止。`));
      break;
    }

    const neighbors = graph.edges.flatMap(([a, b, weight]) => {
      if (a === item.node) return [{ node: b, weight }];
      if (b === item.node) return [{ node: a, weight }];
      return [];
    }).sort((a, b) => a.node.localeCompare(b.node));

    for (const neighbor of neighbors) {
      activeEdge = edgeKey(item.node, neighbor.node);
      if (settled.includes(neighbor.node)) {
        events.push(snapshot("CHECK", `檢查邊 ${item.node}—${neighbor.node}：${neighbor.node} 已定案`, `這條路不能改寫已出爐的距離；跳過此邊。`));
        continue;
      }
      const candidate = distances[item.node] + neighbor.weight;
      if (candidate < distances[neighbor.node]) {
        const previous = distances[neighbor.node];
        distances[neighbor.node] = candidate;
        parents[neighbor.node] = item.node;
        queue.push({ node: neighbor.node, distance: candidate });
        relaxations += 1;
        events.push(snapshot("RELAX", `鬆弛成功：dist[${neighbor.node}] ${previous === Infinity ? "∞" : previous} → ${candidate}`, `經過 ${item.node} 到 ${neighbor.node} 的新走法是 ${distances[item.node]} + ${neighbor.weight} = ${candidate}。更新 parent[${neighbor.node}] = ${item.node}，並把新票放進佇列。`));
      } else {
        events.push(snapshot("KEEP", `檢查邊 ${item.node}—${neighbor.node}：不更新`, `新走法 ${distances[item.node]} + ${neighbor.weight} = ${candidate}，沒有比目前 dist[${neighbor.node}] = ${distances[neighbor.node]} 更短。`));
      }
    }
    activeNode = null;
    activeEdge = null;
  }

  if (!events[events.length - 1].tag.includes("DONE")) {
    activeNode = null;
    activeEdge = null;
    events.push(snapshot("DONE", `佇列已空，找不到到 ${state.end} 的路`, `從 ${state.start} 無法抵達 ${state.end}；其距離維持 ∞。`));
  }
  return events;
}

function setSelectOptions() {
  const nodes = getGraph().nodes;
  for (const select of [$("#start-select"), $("#end-select")]) {
    const previous = select.value;
    select.replaceChildren(...nodes.map(({ id }) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = id;
      return option;
    }));
    select.value = nodes.some(({ id }) => id === previous) ? previous : nodes[0].id;
  }
  state.start = $("#start-select").value;
  state.end = $("#end-select").value;
  if (state.start === state.end) {
    const other = nodes.find(({ id }) => id !== state.start);
    state.end = other.id;
    $("#end-select").value = state.end;
  }
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function renderGraph(frame) {
  const graph = getGraph();
  const nodeById = Object.fromEntries(graph.nodes.map((node) => [node.id, node]));
  const pathEdges = new Set(frame.finalPath.slice(1).map((node, index) => edgeKey(frame.finalPath[index], node)));
  const queuedNodes = new Set(frame.queue.filter((entry) => entry.distance === frame.distances[entry.node]).map((entry) => entry.node));
  const edgeMarkup = graph.edges.map(([a, b, weight]) => {
    const first = nodeById[a];
    const second = nodeById[b];
    const active = frame.activeEdge === edgeKey(a, b);
    const path = pathEdges.has(edgeKey(a, b));
    const labelX = (first.x + second.x) / 2;
    const labelY = (first.y + second.y) / 2 - 8;
    return `<g><line class="edge-line${active ? " active-edge" : ""}${path ? " path-edge" : ""}" x1="${first.x}" y1="${first.y}" x2="${second.x}" y2="${second.y}"/><rect class="edge-label-bg" x="${labelX - 11}" y="${labelY - 10}" width="22" height="20" rx="5"/><text class="edge-weight" x="${labelX}" y="${labelY}">${weight}</text></g>`;
  }).join("");
  const nodeMarkup = graph.nodes.map((node) => {
    const active = frame.activeNode === node.id;
    const settled = frame.settled.includes(node.id);
    const queued = queuedNodes.has(node.id);
    const status = active ? "active" : settled ? "settled" : queued ? "queued" : "";
    const distance = Number.isFinite(frame.distances[node.id]) ? frame.distances[node.id] : "∞";
    const caption = node.id === state.start ? "起點" : node.id === state.end ? "終點" : "";
    return `<g class="node-group ${status}"><text class="distance-label" x="${node.x}" y="${node.y - 36}">${distance}</text><circle class="node-circle" cx="${node.x}" cy="${node.y}" r="22"/><text class="node-label" x="${node.x}" y="${node.y + 1}">${escapeText(node.id)}</text>${caption ? `<text class="node-caption" x="${node.x}" y="${node.y + 44}">${caption}</text>` : ""}</g>`;
  }).join("");
  svg.innerHTML = `${edgeMarkup}${nodeMarkup}`;
  svg.setAttribute("aria-label", `${graph.name}：${state.start} 到 ${state.end}，目前步驟 ${frame.title}`);
  $("#graph-count").textContent = `${graph.nodes.length} 節點 · ${graph.edges.length} 邊`;
}

function renderQueue(frame) {
  const queueList = $("#queue-list");
  const sorted = [...frame.queue].sort((a, b) => a.distance - b.distance || a.node.localeCompare(b.node));
  $("#queue-count").textContent = `${sorted.length} 條目`;
  if (!sorted.length) {
    queueList.innerHTML = '<div class="queue-empty">佇列是空的</div>';
    return;
  }
  queueList.innerHTML = sorted.map((entry, index) => {
    const outdated = entry.distance > frame.distances[entry.node] || frame.settled.includes(entry.node);
    return `<div class="queue-item${index === 0 && !outdated ? " next" : ""}${outdated ? " stale" : ""}"><span>(${entry.distance}, ${escapeText(entry.node)})</span><span>${outdated ? "過期" : index === 0 ? "← 下一個取出" : ""}</span></div>`;
  }).join("");
}

function renderTable(frame) {
  const body = $("#distance-body");
  body.innerHTML = getGraph().nodes.map(({ id }) => {
    const settled = frame.settled.includes(id);
    const queued = frame.queue.some((item) => item.node === id && item.distance === frame.distances[id]);
    const active = frame.activeNode === id && !settled;
    const status = settled ? ["已出爐", "settled"] : active ? ["展開中", "active"] : queued ? ["排隊中", "queued"] : ["未探索", "unseen"];
    const distance = Number.isFinite(frame.distances[id]) ? frame.distances[id] : "∞";
    return `<tr><td>${escapeText(id)}</td><td>${distance}</td><td>${frame.parents[id] ? escapeText(frame.parents[id]) : "—"}</td><td class="status-${status[1]}">${status[0]}</td></tr>`;
  }).join("");
  $("#settled-count").textContent = `出爐 ${frame.settled.length} / ${getGraph().nodes.length}`;
}

function setChallengeOptions(frame) {
  const options = $("#challenge-options");
  const next = [...frame.queue].sort((a, b) => a.distance - b.distance || a.node.localeCompare(b.node))[0];
  if (!next || state.challengeAnswered) {
    options.replaceChildren();
    $("#challenge-prompt").textContent = frame.tag === "DONE" ? "這一關已完成！" : "沒有待取出的節點。";
    return;
  }
  $("#challenge-prompt").textContent = `下一個會從佇列取出哪個節點？（距離也要答對）`;
  const choices = [...new Set([next.node, ...getGraph().nodes.map((node) => node.id).filter((id) => id !== next.node).sort(() => 0.5 - Math.random()).slice(0, 2)])].sort();
  options.innerHTML = choices.map((id) => `<button class="challenge-option" type="button" data-answer="${escapeText(id)}">${escapeText(id)}</button>`).join("");
  options.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.challengeAnswered = true;
      const correct = button.dataset.answer === next.node;
      button.classList.add(correct ? "correct" : "incorrect");
      options.querySelectorAll("button").forEach((option) => {
        option.disabled = true;
        if (option.dataset.answer === next.node) option.classList.add("correct");
      });
      if (correct) {
        state.streak += 1;
        state.score += 10 + Math.max(0, state.streak - 1) * 5;
        $("#challenge-feedback").textContent = `答對了！(${next.distance}, ${next.node}) 是目前最小的票。得分 ${state.score} · 連續 ${state.streak} 題`;
      } else {
        state.streak = 0;
        $("#challenge-feedback").textContent = `這次不對。距離最小的是 (${next.distance}, ${next.node})，優先佇列每次都先取出它。`;
      }
      $("#next-button").disabled = false;
    });
  });
}

function render() {
  const frame = state.trace[state.index];
  renderGraph(frame);
  renderQueue(frame);
  renderTable(frame);
  $("#step-tag").textContent = frame.tag;
  $("#step-title").textContent = frame.title;
  $("#step-detail").textContent = frame.detail;
  $("#prev-button").disabled = state.index === 0 || state.mode === "challenge" && !state.challengeAnswered;
  $("#next-button").disabled = state.index >= state.trace.length - 1 || state.mode === "challenge" && !state.challengeAnswered;
  $("#progress-count").textContent = `${state.index} / ${state.trace.length - 1}`;
  const progress = state.trace.length > 1 ? state.index / (state.trace.length - 1) * 100 : 100;
  $(".progress-track").setAttribute("aria-valuenow", String(Math.round(progress)));
  $("#progress-fill").style.width = `${progress}%`;
  $("#stat-pops").textContent = frame.pops;
  $("#stat-stale").textContent = frame.stale;
  $("#stat-relax").textContent = frame.relaxations;
  $("#stat-settled").textContent = frame.settled.length;
  $("#challenge-card").hidden = state.mode !== "challenge";
  if (state.mode === "challenge") setChallengeOptions(frame);
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
  if (state.index < state.trace.length - 1) {
    state.index += 1;
    state.challengeAnswered = false;
    $("#challenge-feedback").textContent = "";
    render();
  } else {
    stopPlayback();
  }
}

function reset() {
  stopPlayback();
  state.trace = buildTrace();
  state.index = 0;
  state.challengeAnswered = false;
  $("#challenge-feedback").textContent = "";
  render();
}

function setMode(mode) {
  stopPlayback();
  state.mode = mode;
  state.challengeAnswered = false;
  state.streak = 0;
  if (mode === "challenge") $("#challenge-feedback").textContent = `得分 ${state.score} · 連續答對 ${state.streak} 題`;
  $("#demo-mode").classList.toggle("active", mode === "demo");
  $("#challenge-mode").classList.toggle("active", mode === "challenge");
  $("#demo-mode").setAttribute("aria-pressed", String(mode === "demo"));
  $("#challenge-mode").setAttribute("aria-pressed", String(mode === "challenge"));
  render();
}

document.querySelectorAll(".graph-tab").forEach((button) => {
  button.addEventListener("click", () => {
    state.graphKey = button.dataset.graph;
    document.querySelectorAll(".graph-tab").forEach((tab) => {
      const selected = tab === button;
      tab.classList.toggle("selected", selected);
      tab.setAttribute("aria-pressed", String(selected));
    });
    setSelectOptions();
    reset();
  });
});

$("#start-select").addEventListener("change", (event) => {
  state.start = event.target.value;
  if (state.start === state.end) {
    const other = getGraph().nodes.find(({ id }) => id !== state.start);
    state.end = other.id;
    $("#end-select").value = state.end;
  }
  reset();
});
$("#end-select").addEventListener("change", (event) => {
  state.end = event.target.value;
  if (state.end === state.start) {
    const other = getGraph().nodes.find(({ id }) => id !== state.end);
    state.start = other.id;
    $("#start-select").value = state.start;
  }
  reset();
});
$("#next-button").addEventListener("click", advance);
$("#prev-button").addEventListener("click", () => {
  if (state.index > 0) {
    state.index -= 1;
    state.challengeAnswered = false;
    $("#challenge-feedback").textContent = "";
    render();
  }
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
  render();
  state.timer = window.setInterval(advance, 1150);
});
$("#demo-mode").addEventListener("click", () => setMode("demo"));
$("#challenge-mode").addEventListener("click", () => setMode("challenge"));
document.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) return;
  if (event.key === "ArrowRight") {
    event.preventDefault();
    if (!$("#next-button").disabled) advance();
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    if (!$("#prev-button").disabled && state.index > 0) {
      state.index -= 1;
      state.challengeAnswered = false;
      render();
    }
  } else if (event.code === "Space" && state.mode === "demo") {
    event.preventDefault();
    $("#play-button").click();
  }
});

setSelectOptions();
reset();
