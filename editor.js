// Состояние приложения
const state = {
    scenarios: [],
    user: null,
    selectedStage: null
};

// Элементы DOM
const fioModal = document.getElementById("fio-modal");
const fioInput = document.getElementById("fio-input");
const fioSubmit = document.getElementById("fio-submit");
const userFio = document.getElementById("user-fio");
const changeFioBtn = document.getElementById("change-fio-btn");
const addStageBtn = document.getElementById("add-stage-btn");
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
    } else {
        // Добавляем начальные координаты для этапов
        state.scenarios = state.scenarios.map((stage, index) => ({
            ...stage,
            x: 100 + (index % 5) * 250,
            y: 100 + Math.floor(index / 5) * 150
        }));
    }

    renderDiagram();
}

// Активация/деактивация редактора
function enableEditor() {
    addStageBtn.disabled = false;
    editJsonBtn.disabled = false;
    saveJsonBtn.disabled = false;
    loadJsonBtn.disabled = false;
    document.querySelector(".editor-panel").style.opacity = "1";
}

function disableEditor() {
    addStageBtn.disabled = true;
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

// Отрисовка схемы
function renderDiagram() {
    diagram.innerHTML = "";

    // Рисуем этапы
    state.scenarios.forEach((stage, index) => {
        const stageCard = document.createElement("div");
        stageCard.className = "stage-card";
        stageCard.style.left = `${stage.x}px`;
        stageCard.style.top = `${stage.y}px`;
        if (state.selectedStage === stage.id) {
            stageCard.classList.add("selected");
        }
        stageCard.innerHTML = `
            <h3>${stage.id}</h3>
            <p>${stage.text}</p>
        `;
        stageCard.addEventListener("click", (e) => {
            e.stopPropagation(); // Предотвращаем срабатывание событий на доске
            openEditModal(index);
        });
        diagram.appendChild(stageCard);

        // Настройка перетаскивания
        interact(stageCard).draggable({
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
            }
        });
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
        stage.options.forEach(option => {
            const nextStage = state.scenarios.find(s => s.id === option.next);
            if (nextStage) {
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.className = "arrow";
                svg.style.position = "absolute";
                svg.style.zIndex = "-1";

                const startX = stage.x + 200 / 2; // Центр карточки (ширина 200px)
                const startY = stage.y + 50; // Низ карточки (высота ~50px)
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
                svg.innerHTML = `
                    <line x1="${startX - minX}" y1="${startY - minY}" x2="${endX - minX}" y2="${endY - minY}" stroke="#4A90E2" stroke-width="2"/>
                    <text x="${(startX + endX) / 2 - minX}" y="${(startY + endY) / 2 - minY}" fill="#555" font-size="12" text-anchor="middle">${option.text}</text>
                `;
                diagram.appendChild(svg);
            }
        });
    });
}

// Редактирование JSON
editJsonBtn.addEventListener("click", () => {
    jsonEditor.value = JSON.stringify(state.scenarios, null, 2);
    editJsonModal.classList.add("active");
});

applyJsonBtn.addEventListener("click", () => {
    try {
        const newScenarios = JSON.parse(jsonEditor.value);
        state.scenarios = newScenarios.map((stage, index) => ({
            ...stage,
            x: stage.x || 100 + (index % 5) * 250,
            y: stage.y || 100 + Math.floor(index / 5) * 150
        }));
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

// Добавление этапа
addStageBtn.addEventListener("click", () => {
    const newId = `stage_${state.scenarios.length}`;
    state.scenarios.push({
        id: newId,
        text: "Новый этап",
        options: [],
        x: 100 + (state.scenarios.length % 5) * 250,
        y: 100 + Math.floor(state.scenarios.length / 5) * 150
    });
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
                const newScenarios = JSON.parse(e.target.result);
                state.scenarios = newScenarios.map((stage, index) => ({
                    ...stage,
                    x: stage.x || 100 + (index % 5) * 250,
                    y: stage.y || 100 + Math.floor(index / 5) * 150
                }));
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
    // Обновляем связи
    state.scenarios.forEach(stage => {
        stage.options = stage.options.map(opt => ({
            ...opt,
            next: opt.next === deletedId ? "" : opt.next
        }));
    });
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
