// Состояние приложения
const state = {
    scenarios: [],
    user: null,
    selectedStage: null,
    activePath: [], // Путь, который выбрал пользователь
    isDragging: false
};

// Элементы DOM
const fioModal = document.getElementById("fio-modal");
const fioInput = document.getElementById("fio-input");
const fioSubmit = document.getElementById("fio-submit");
const userFio = document.getElementById("user-fio");
const changeFioBtn = document.getElementById("change-fio-btn");
const addStageBtn = document.getElementById("add-stage-btn");
const autoAlignBtn = document.getElementById("auto-align-btn");
const editJsonBtn = document.getElementById("edit-json-btn");
const saveJsonBtn = document.getElementById("save-json-btn");
const loadJsonBtn = document.getElementById("load-json-btn");
const jsonFileInput = document.getElementById("json-file");
const editJsonModal = document.getElementById("edit-json-modal");
const jsonEditor = document.getElementById("json-editor");
const applyJsonBtn = document.getElementById("apply-json-btn");
const cancelJsonBtn = document.getElementById("cancel-json-btn");
const diagram = document.getElementById("diagram");
const editStageModal = document.getElementById("edit-stage-modal");
const editStageId = document.getElementById("edit-stage-id");
const editStageText = document.getElementById("edit-stage-text");
const editStageOptions = document.getElementById("edit-stage-options");
const addOptionBtn = document.getElementById("add-option-btn");
const deleteStageBtn = document.getElementById("delete-stage-btn");
const saveStageBtn = document.getElementById("save-stage-btn");
const cancelStageBtn = document.getElementById("cancel-stage-btn");

// Инициализация
function init() {
    // Проверяем ФИО
    const savedFio = localStorage.getItem("userFio");
    if (savedFio) {
        state.user = savedFio;
        userFio.textContent = savedFio;
        enableEditor();
    } else {
        fioModal.classList.add("active");
        disableEditor();
    }

    // Загружаем сохранённые сценарии
    const savedScenarios = localStorage.getItem("scenarios");
    if (savedScenarios) {
        state.scenarios = JSON.parse(savedScenarios);
        cleanScenarios();
    }

    autoAlign(); // Автовиравнивание при загрузке
    renderDiagram();
}

// Активация/деактивация редактора
function enableEditor() {
    addStageBtn.disabled = false;
    autoAlignBtn.disabled = false;
    editJsonBtn.disabled = false;
    saveJsonBtn.disabled = false;
    loadJsonBtn.disabled = false;
    document.querySelector(".editor-panel").style.opacity = "1";
}

function disableEditor() {
    addStageBtn.disabled = true;
    autoAlignBtn.disabled = true;
    editJsonBtn.disabled = true;
    saveJsonBtn.disabled = true;
    loadJsonBtn.disabled = true;
    document.querySelector(".editor-panel").style.opacity = "0.5";
}

// Обработчик ввода ФИО
fioSubmit.addEventListener("click", () => {
    const fio = fioInput.value.trim();
    if (fio) {
        state.user = fio;
        localStorage.setItem("userFio", fio);
        userFio.textContent = fio;
        fioModal.classList.remove("active");
        enableEditor();
    } else {
        alert("Пожалуйста, введите ваше ФИО.");
    }
});

changeFioBtn.addEventListener("click", () => {
    localStorage.removeItem("userFio");
    state.user = null;
    fioModal.classList.add("active");
    disableEditor();
});

// Очистка сценариев (удаление некорректных связей)
function cleanScenarios() {
    const stageIds = state.scenarios.map(s => s.id);
    state.scenarios.forEach(stage => {
        stage.options = stage.options.filter(opt => !opt.next || stageIds.includes(opt.next));
    });
}

// Автовиравнивание
function autoAlign() {
    if (state.scenarios.length === 0) return;

    // Определяем уровни вложенности
    const levels = new Map();
    const referencedStages = new Set(state.scenarios.flatMap(s => s.options.map(opt => opt.next).filter(Boolean)));
    let startStage = state.scenarios.find(s => !referencedStages.has(s.id));
    if (!startStage) startStage = state.scenarios[0];

    function assignLevel(stageId, level = 0) {
        if (!stageId || levels.has(stageId)) return;
        levels.set(stageId, level);
        const stage = state.scenarios.find(s => s.id === stageId);
        if (!stage) return;
        stage.options.forEach(opt => {
            if (opt.next) assignLevel(opt.next, level + 1);
        });
    }
    assignLevel(startStage.id);

    // Группируем этапы по уровням
    const stagesByLevel = Array.from(levels.entries()).reduce((acc, [stageId, level]) => {
        if (!acc[level]) acc[level] = [];
        acc[level].push(stageId);
        return acc;
    }, []);

    // Распределяем координаты
    const stageWidth = 250; // Ширина этапа + отступ
    const levelHeight = 150; // Высота уровня
    stagesByLevel.forEach((stageIds, level) => {
        const count = stageIds.length;
        const totalWidth = count * stageWidth;
        const startX = 1500 - totalWidth / 2; // Центрируем этапы (половина ширины доски - половина этапов)
        stageIds.forEach((stageId, index) => {
            const stage = state.scenarios.find(s => s.id === stageId);
            stage.x = startX + index * stageWidth;
            stage.y = 100 + level * levelHeight;
        });
    });

    localStorage.setItem("scenarios", JSON.stringify(state.scenarios));
    renderDiagram();
}

// Отрисовка схемы
function renderDiagram() {
    diagram.innerHTML = "";
    state.activePath = []; // Сбрасываем путь

    // Рисуем этапы
    state.scenarios.forEach((stage, index) => {
        const stageCard = document.createElement("div");
        stageCard.className = "stage-card";
        stageCard.style.left = `${stage.x}px`;
        stageCard.style.top = `${stage.y}px`;
        if (state.selectedStage === stage.id) {
            stageCard.classList.add("selected");
        }
        if (state.activePath.includes(stage.id)) {
            stageCard.classList.add("active-path");
        }
        stageCard.innerHTML = `
            <h3>${stage.id}</h3>
            <p>${stage.text}</p>
        `;
        stageCard.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!state.isDragging) {
                openEditModal(index);
            }
        });
        diagram.appendChild(stageCard);

        // Настройка перетаскивания
        interact(stageCard).draggable({
            onstart: () => {
                state.isDragging = true;
            },
            onmove: (event) => {
                const target = event.target;
                const x = (parseFloat(target.style.left) || stage.x) + event.dx;
                const y = (parseFloat(target.style.top) || stage.y) + event.dy;
                target.style.left = `${x}px`;
                target.style.top = `${y}px`;
                stage.x = x;
                stage.y = y;
                renderArrows();
            },
            onend: () => {
                localStorage.setItem("scenarios", JSON.stringify(state.scenarios));
                setTimeout(() => {
                    state.isDragging = false;
                }, 100);
            }
        });

        // Рисуем варианты ответов
        const optionsDiv = document.createElement("div");
        optionsDiv.className = "stage-options";
        optionsDiv.style.left = `${stage.x}px`;
        optionsDiv.style.top = `${stage.y + 50}px`; // Ниже этапа (высота этапа ~50px)
        stage.options.forEach((option, optIndex) => {
            const optionBtn = document.createElement("div");
            optionBtn.className = "option-btn";
            if (state.activePath.includes(option.next)) {
                optionBtn.classList.add("active-path");
            }
            optionBtn.textContent = option.text;
            optionBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                state.activePath = getPathTo(stage.id, option.next);
                renderDiagram();
            });
            optionsDiv.appendChild(optionBtn);
        });
        diagram.appendChild(optionsDiv);
    });

    renderArrows();
}

// Рисование стрелок
function renderArrows() {
    // Удаляем старые стрелки
    const existingArrows = diagram.querySelectorAll(".arrow");
    existingArrows.forEach(arrow => arrow.remove());

    // Рисуем новые стрелки
    state.scenarios.forEach(stage => {
        const optionsDiv = Array.from(diagram.querySelectorAll(".stage-options")).find(div =>
            parseFloat(div.style.left) === stage.x && parseFloat(div.style.top) === stage.y + 50
        );
        if (!optionsDiv) return;

        const optionButtons = optionsDiv.querySelectorAll(".option-btn");
        stage.options.forEach((option, optIndex) => {
            const nextStage = state.scenarios.find(s => s.id === option.next);
            if (nextStage) {
                const optionBtn = optionButtons[optIndex];
                const optionRect = optionBtn.getBoundingClientRect();
                const diagramRect = diagram.getBoundingClientRect();

                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.className = "arrow";
                svg.style.position = "absolute";
                svg.style.zIndex = "-1";

                const startX = stage.x + 200 / 2; // Центр этапа (ширина 200px)
                const startY = stage.y + 50 + (optIndex + 1) * 30; // Низ варианта (высота варианта ~30px)
                const endX = nextStage.x + 200 / 2;
                const endY = nextStage.y;

                // Устанавливаем размеры SVG
                const minX = Math.min(startX, endX);
                const minY = Math.min(startY, endY);
                const maxX = Math.max(startX, endX);
                const maxY = Math.max(startY, endY);
                svg.style.left = `${minX}px`;
                svg.style.top = `${minY}px`;
                svg.style.width = `${maxX - minX}px`;
                svg.style.height = `${maxY - minY}px`;

                // Рисуем линию
                const strokeColor = state.activePath.includes(nextStage.id) ? "#28a745" : "#4A90E2";
                svg.innerHTML = `
                    <line x1="${startX - minX}" y1="${startY - minY}" x2="${endX - minX}" y2="${endY - minY}" stroke="${strokeColor}" stroke-width="2"/>
                    <text x="${(startX + endX) / 2 - minX}" y="${(startY + endY) / 2 - minY}" fill="#555" font-size="12" text-anchor="middle">${option.text}</text>
                `;
                diagram.appendChild(svg);
            }
        });
    });
}

// Получение пути от начального этапа до целевого
function getPathTo(fromId, toId) {
    const path = [fromId];
    function findPath(currentId) {
        if (currentId === toId) return true;
        const stage = state.scenarios.find(s => s.id === currentId);
        if (!stage) return false;
        for (const option of stage.options) {
            if (option.next && findPath(option.next)) {
                path.push(option.next);
                return true;
            }
        }
        return false;
    }
    findPath(fromId);
    return path;
}

// Редактирование JSON
editJsonBtn.addEventListener("click", () => {
    jsonEditor.value = JSON.stringify(state.scenarios, null, 2);
    editJsonModal.classList.add("active");
});

applyJsonBtn.addEventListener("click", () => {
    try {
        state.scenarios = JSON.parse(jsonEditor.value);
        cleanScenarios();
        autoAlign();
        localStorage.setItem("scenarios", JSON.stringify(state.scenarios));
        renderDiagram();
        editJsonModal.classList.remove("active");
    } catch (error) {
        alert("Ошибка в JSON: " + error.message);
    }
});

cancelJsonBtn.addEventListener("click", () => {
    editJsonModal.classList.remove("active");
});

// Автовиравнивание по кнопке
autoAlignBtn.addEventListener("click", () => {
    autoAlign();
});

// Добавление этапа
addStageBtn.addEventListener("click", () => {
    const newId = `stage_${state.scenarios.length}`;
    // Начальные координаты (будут переопределены при автовиравнивании)
    const newStage = {
        id: newId,
        text: "Новый этап",
        options: [],
        x: 1500,
        y: 100
    };
    state.scenarios.push(newStage);
    cleanScenarios();
    autoAlign();
    localStorage.setItem("scenarios", JSON.stringify(state.scenarios));
    renderDiagram();
});

// Сохранение JSON
saveJsonBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.scenarios, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scenarios.json";
    a.click();
    URL.revokeObjectURL(url);
});

// Загрузка JSON
loadJsonBtn.addEventListener("click", () => {
    jsonFileInput.click();
});

jsonFileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                state.scenarios = JSON.parse(e.target.result);
                cleanScenarios();
                autoAlign();
                localStorage.setItem("scenarios", JSON.stringify(state.scenarios));
                renderDiagram();
            } catch (error) {
                alert("Ошибка загрузки JSON: " + error.message);
            }
        };
        reader.readAsText(file);
    }
});

// Редактирование этапа
function openEditModal(index) {
    const stage = state.scenarios[index];
    state.selectedStage = stage.id;
    editStageId.value = stage.id;
    editStageText.value = stage.text;
    editStageOptions.innerHTML = "";
    stage.options.forEach((option, optIndex) => {
        const optionRow = document.createElement("div");
        optionRow.className = "option-row";
        optionRow.innerHTML = `
            <input type="text" value="${option.text}" placeholder="Текст варианта">
            <select>
                <option value="">Нет перехода</option>
                ${state.scenarios.map(s => `<option value="${s.id}" ${s.id === option.next ? "selected" : ""}>${s.id}</option>`).join("")}
            </select>
            <button>Удалить</button>
        `;
        const deleteBtn = optionRow.querySelector("button");
        deleteBtn.addEventListener("click", () => {
            stage.options.splice(optIndex, 1);
            localStorage.setItem("scenarios", JSON.stringify(state.scenarios));
            openEditModal(index);
        });
        editStageOptions.appendChild(optionRow);
    });
    editStageModal.classList.add("active");
    renderDiagram();
}

addOptionBtn.addEventListener("click", () => {
    const stageIndex = state.scenarios.findIndex(s => s.id === state.selectedStage);
    state.scenarios[stageIndex].options.push({
        text: "Новый вариант",
        next: ""
    });
    localStorage.setItem("scenarios", JSON.stringify(state.scenarios));
    openEditModal(stageIndex);
});

deleteStageBtn.addEventListener("click", () => {
    const stageIndex = state.scenarios.findIndex(s => s.id === state.selectedStage);
    const deletedId = state.scenarios[stageIndex].id;
    state.scenarios.splice(stageIndex, 1);
    cleanScenarios();
    autoAlign();
    localStorage.setItem("scenarios", JSON.stringify(state.scenarios));
    state.selectedStage = null;
    editStageModal.classList.remove("active");
    renderDiagram();
});

saveStageBtn.addEventListener("click", () => {
    const stageIndex = state.scenarios.findIndex(s => s.id === state.selectedStage);
    const stage = state.scenarios[stageIndex];
    const oldId = stage.id;
    stage.id = editStageId.value;
    stage.text = editStageText.value;
    stage.options = Array.from(editStageOptions.children).map(row => ({
        text: row.querySelector("input").value,
        next: row.querySelector("select").value
    }));
    // Обновляем связи, если ID изменился
    if (oldId !== stage.id) {
        state.scenarios.forEach(s => {
            s.options = s.options.map(opt => ({
                ...opt,
                next: opt.next === oldId ? stage.id : opt.next
            }));
        });
    }
    cleanScenarios();
    autoAlign();
    localStorage.setItem("scenarios", JSON.stringify(state.scenarios));
    state.selectedStage = null;
    editStageModal.classList.remove("active");
    renderDiagram();
});

cancelStageBtn.addEventListener("click", () => {
    state.selectedStage = null;
    editStageModal.classList.remove("active");
    renderDiagram();
});

init();
