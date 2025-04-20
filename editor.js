let scenarios = [];

function renderDiagram() {
    const diagram = document.getElementById("diagram");
    diagram.innerHTML = `
        <svg id="arrows" style="width: 100%;"></svg>
        <div id="stages"></div>
    `;

    const stagesDiv = document.getElementById("stages");
    const arrows = [];

    scenarios.forEach((stage, stageIndex) => {
        const stageDiv = document.createElement("div");
        stageDiv.className = "stage-card";
        stageDiv.dataset.id = stage.id;
        stageDiv.innerHTML = `
            <h3>Этап ${stage.id}</h3>
            <div class="form-group">
                <label>ID:</label>
                <input type="text" value="${stage.id}" onchange="updateStage(${stageIndex}, 'id', this.value)">
            </div>
            <div class="form-group">
                <label>Текст:</label>
                <textarea onchange="updateStage(${stageIndex}, 'text', this.value)">${stage.text}</textarea>
            </div>
            <h4>Варианты ответов</h4>
            <div class="options">
                ${stage.options.map((opt, optIndex) => `
                    <div class="option-card" data-option-index="${optIndex}">
                        <div class="form-group">
                            <label>Текст:</label>
                            <input type="text" value="${opt.text}" onchange="updateOption(${stageIndex}, ${optIndex}, 'text', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Следующий (ID):</label>
                            <select onchange="updateOption(${stageIndex}, ${optIndex}, 'next', this.value)">
                                <option value="">Выберите этап</option>
                                ${scenarios.map(s => `<option value="${s.id}" ${opt.next === s.id ? "selected" : ""}>${s.id}</option>`).join("")}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Лог:</label>
                            <input type="text" value="${opt.log}" onchange="updateOption(${stageIndex}, ${optIndex}, 'log', this.value)">
                        </div>
                        <button onclick="deleteOption(${stageIndex}, ${optIndex})">Удалить</button>
                    </div>
                `).join("")}
            </div>
            <button onclick="addOption(${stageIndex})">Добавить вариант</button>
            <button onclick="deleteStage(${stageIndex})">Удалить этап</button>
        `;
        stagesDiv.appendChild(stageDiv);

        stage.options.forEach((opt, optIndex) => {
            if (opt.next) {
                arrows.push({ fromStage: stage.id, toStage: opt.next, optionIndex: optIndex });
            }
        });
    });

    // Рисуем стрелки (временное упрощение)
    setTimeout(() => {
        const svg = document.getElementById("arrows");
        const stageCards = document.querySelectorAll(".stage-card");
        let totalWidth = 0;
        stageCards.forEach(card => {
            totalWidth += card.offsetWidth + 40;
        });
        svg.setAttribute("width", totalWidth);
        svg.setAttribute("height", 400);

        svg.innerHTML = "";
        arrows.forEach(arrow => {
            const fromDiv = Array.from(stageCards).find(card => card.dataset.id === arrow.fromStage);
            const toDiv = Array.from(stageCards).find(card => card.dataset.id === arrow.toStage);
            if (fromDiv && toDiv) {
                const fromOption = fromDiv.querySelector(`.option-card[data-option-index="${arrow.optionIndex}"]`);
                if (fromOption) {
                    const fromRect = fromDiv.getBoundingClientRect();
                    const toRect = toDiv.getBoundingClientRect();
                    const diagramRect = diagram.getBoundingClientRect();
                    const fromX = fromRect.right - diagramRect.left;
                    const toX = toRect.left - diagramRect.left;
                    const y = 200;
                    svg.innerHTML += `
                        <line x1="${fromX}" y1="${y}" x2="${toX}" y2="${y}" 
                              stroke="#00A88F" stroke-width="2"/>
                        <polygon points="${toX-5},${y-5} ${toX-5},${y+5} ${toX},${y}" fill="#00A88F"/>
                    `;
                }
            }
        });
    }, 0);

    updateJsonOutput();
}

function updateStage(stageIndex, field, value) {
    scenarios[stageIndex][field] = value;
    renderDiagram();
}

function updateOption(stageIndex, optIndex, field, value) {
    scenarios[stageIndex].options[optIndex][field] = value;
    renderDiagram();
}

function addStage() {
    scenarios.push({
        id: `stage_${scenarios.length}`,
        text: "Новый этап",
        options: []
    });
    renderDiagram();
    // Логируем событие в Firebase Analytics
    analytics.logEvent("add_stage", { stage_count: scenarios.length });
}

function addOption(stageIndex) {
    scenarios[stageIndex].options.push({
        text: "Новый вариант",
        next: "",
        log: "Действие менеджера"
    });
    renderDiagram();
    // Логируем событие
    analytics.logEvent("add_option", { stage_index: stageIndex, option_count: scenarios[stageIndex].options.length });
}

function deleteStage(stageIndex) {
    scenarios.splice(stageIndex, 1);
    renderDiagram();
    // Логируем событие
    analytics.logEvent("delete_stage", { stage_index: stageIndex });
}

function deleteOption(stageIndex, optIndex) {
    scenarios[stageIndex].options.splice(optIndex, 1);
    renderDiagram();
    // Логируем событие
    analytics.logEvent("delete_option", { stage_index: stageIndex, option_index: optIndex });
}

function updateJsonOutput() {
    const jsonOutput = document.getElementById("json-output");
    if (jsonOutput) {
        jsonOutput.value = JSON.stringify(scenarios, null, 2);
    }
}

document.getElementById("add-stage-btn").onclick = addStage;

document.getElementById("save-json-btn").onclick = () => {
    const blob = new Blob([JSON.stringify(scenarios, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scenarios.json";
    a.click();
    URL.revokeObjectURL(url);
    // Логируем событие
    analytics.logEvent("save_json", { scenario_count: scenarios.length });
};

document.getElementById("load-json-btn").onclick = () => {
    document.getElementById("json-file").click();
};

document.getElementById("json-file").onchange = (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                scenarios = JSON.parse(e.target.result);
                renderDiagram();
                updateJsonOutput();
                // Логируем событие
                analytics.logEvent("load_json", { scenario_count: scenarios.length });
            } catch (error) {
                alert("Ошибка загрузки JSON: " + error.message);
            }
        };
        reader.readAsText(file);
    }
};

// Инициализация
scenarios = [{
    id: "0",
    text: "Начальный этап",
    options: []
}];
renderDiagram();