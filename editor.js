// Состояние приложения
const state = {
    scenarios: [],
    user: null,
    selectedStage: null,
    activePath: [] // Путь, который выбрал пользователь
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
        cleanScenarios();
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

// Очистка сценариев (удаление некорректных связей)
function cleanScenarios() {
    const stageIds = state.scenarios.map(s => s.id);
    state.scenarios.forEach(stage => {
        stage.options = stage.options.filter(opt => !opt.next || stageIds.includes(opt.next));
    });
}

// Отрисовка схемы (древовидная структура)
function renderDiagram() {
    diagram.innerHTML = "";
    state.activePath = []; // Сбрасываем путь
    if (state.scenarios.length === 0) return;

    // Начинаем с первого этапа
    const visited = new Set();
    function renderStage(stageId, depth = 0) {
        const stage = state.scenarios.find(s => s.id === stageId);
        if (!stage || visited.has(stageId)) return;
        visited.add(stageId);

        // Рисуем этап
        const stageCard = document.createElement("div");
        stageCard.className = "stage-card";
        if (state.selectedStage === stage.id) {
            stageCard.classList.add("selected");
        }
        if (state.activePath.includes(stage.id)) {
            stageCard.classList.add("active-path");
        }
        stageCard.style.marginLeft = `${depth * 20}px`;
        stageCard.innerHTML = `
            <h3>${stage.id}</h3>
            <p>${stage.text}</p>
        `;
        stageCard.addEventListener("click", () => {
            const index = state.scenarios.findIndex(s => s.id === stageId);
            openEditModal(index);
        });
        diagram.appendChild(stageCard);

        // Рисуем варианты ответов
        if (stage.options.length > 0) {
            const optionsDiv = document.createElement("div");
            optionsDiv.className = "stage-options";
            optionsDiv.style.marginLeft = `${depth * 20}px`;
            stage.options.forEach((option, optIndex) => {
                const optionBtn = document.createElement("div");
                optionBtn.className = "option-btn";
                if (state.activePath.includes(option.next)) {
                    optionBtn.classList.add("active-path");
                }
                optionBtn.textContent = option.text;
                optionBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    // Обновляем путь
                    state.activePath = getPathTo(stage.id, option.next);
                    renderDiagram();
                });
                optionsDiv.appendChild(optionBtn);

                // Рисуем стрелку
                const arrow = document.createElement("div");
                arrow.className = "arrow";
                arrow.innerHTML = `
                    <svg viewBox="0 0 30 30">
                        <line x1="15" y1="0" x2="15" y2="30" stroke="${state.activePath.includes(option.next) ? '#28a745' : '#4A90E2'}" stroke-width="2"/>
                        <polygon points="10,25 15,30 20,25" fill="${state.activePath.includes(option.next) ? '#28a745' : '#4A90E2'}"/>
                    </svg>
                `;
                diagram.appendChild(arrow);

                // Рекурсивно рисуем следующий этап
                if (option.next) {
                    renderStage(option.next, depth + 1);
                }
            });
            diagram.appendChild(optionsDiv);
        }
    }

    // Находим начальный этап (первый в списке или тот, на который никто не ссылается)
    let startStage = state.scenarios[0].id;
    const referencedStages = new Set(state.scenarios.flatMap(s => s.options.map(opt => opt.next).filter(Boolean)));
    const nonReferenced = state.scenarios.find(s => !referencedStages.has(s.id));
    if (nonReferenced) startStage = nonReferenced.id;

    renderStage(startStage);
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
        options: []
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
                state.scenarios = JSON.parse(e.target.result);
                cleanScenarios();
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
