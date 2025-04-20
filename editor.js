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
const saveJsonBtn = document.getElementById("save-json-btn");
const loadJsonBtn = document.getElementById("load-json-btn");
const jsonFileInput = document.getElementById("json-file");
const toggleJsonBtn = document.getElementById("toggle-json-btn");
const jsonPanel = document.getElementById("json-panel");
const jsonEditor = document.getElementById("json-editor");
const applyJsonBtn = document.getElementById("apply-json-btn");
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
    }

    renderDiagram();
    updateJsonEditor();
}

// Активация/деактивация редактора
function enableEditor() {
    addStageBtn.disabled = false;
    saveJsonBtn.disabled = false;
    loadJsonBtn.disabled = false;
    toggleJsonBtn.disabled = false;
    document.querySelector(".editor-panel").style.opacity = "1";
}

function disableEditor() {
    addStageBtn.disabled = true;
    saveJsonBtn.disabled = true;
    loadJsonBtn.disabled = true;
    toggleJsonBtn.disabled = true;
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
    state.scenarios.forEach((stage, index) => {
        const stageCard = document.createElement("div");
        stageCard.className = "stage-card";
        if (state.selectedStage === stage.id) {
            stageCard.classList.add("selected");
        }
        stageCard.innerHTML = `
            <h3>${stage.id}</h3>
            <p>${stage.text}</p>
        `;
        stageCard.addEventListener("click", () => openEditModal(index));
        diagram.appendChild(stageCard);

        // Рисуем стрелки
        stage.options.forEach(option => {
            const nextStage = state.scenarios.find(s => s.id === option.next);
            if (nextStage) {
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.setAttribute("class", "arrow");
                svg.innerHTML = `
                    <line x1="50%" y1="100%" x2="50%" y2="0%" stroke="#1A3C5E" stroke-width="2"/>
                    <text x="50%" y="50%" fill="#555" font-size="12" text-anchor="middle">${option.text}</text>
                `;
                diagram.appendChild(svg);
            }
        });
    });
}

// Обновление JSON-редактора
function updateJsonEditor() {
    jsonEditor.value = JSON.stringify(state.scenarios, null, 2);
}

// Показ/скрытие JSON
toggleJsonBtn.addEventListener("click", () => {
    if (jsonPanel.style.display === "none") {
        jsonPanel.style.display = "block";
        toggleJsonBtn.innerHTML = '<span class="material-icons">code</span> Скрыть JSON';
        updateJsonEditor();
    } else {
        jsonPanel.style.display = "none";
        toggleJsonBtn.innerHTML = '<span class="material-icons">code</span> Показать JSON';
    }
});

// Применение изменений JSON
applyJsonBtn.addEventListener("click", () => {
    try {
        const newScenarios = JSON.parse(jsonEditor.value);
        state.scenarios = newScenarios;
        localStorage.setItem("scenarios", JSON.stringify(state.scenarios));
        renderDiagram();
    } catch (error) {
        alert("Ошибка в JSON: " + error.message);
    }
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
    updateJsonEditor();
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
                localStorage.setItem("scenarios", JSON.stringify(state.scenarios));
                renderDiagram();
                updateJsonEditor();
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
    const stageIndex = state.scenarios.findIndex(s => s.id === stage.selectedStage);
    state.scenarios[stageIndex].options.push({
        text: "Новый вариант",
        next: ""
    });
    localStorage.setItem("scenarios", JSON.stringify(state.scenarios));
    openEditModal(stageIndex);
});

deleteStageBtn.addEventListener("click", () => {
    const stageIndex = state.scenarios.findIndex(s => s.id === state.selectedStage);
    state.scenarios.splice(stageIndex, 1);
    // Обновляем связи
    state.scenarios.forEach(stage => {
        stage.options = stage.options.map(opt => ({
            ...opt,
            next: opt.next === state.selectedStage ? "" : opt.next
        }));
    });
    localStorage.setItem("scenarios", JSON.stringify(state.scenarios));
    state.selectedStage = null;
    editStageModal.classList.remove("active");
    renderDiagram();
    updateJsonEditor();
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
    updateJsonEditor();
});

cancelStageBtn.addEventListener("click", () => {
    state.selectedStage = null;
    editStageModal.classList.remove("active");
    renderDiagram();
});

init();
