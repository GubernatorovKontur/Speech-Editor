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
const diagram = document.getElementById("diagram");
const editStageModal = document.getElementById("edit-stage-modal");
const editStageId = document.getElementById("edit-stage-id");
const editStageText = document.getElementById("edit-stage-text");
const editStageOptions = document.getElementById("edit-stage-options");
const addOptionBtn = document.getElementById("add-option-btn");
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

    // Загружаем сохранённые сценарии, если есть
    const savedScenarios = localStorage.getItem("scenarios");
    if (savedScenarios) {
        state.scenarios = JSON.parse(savedScenarios);
    }

    renderDiagram();
}

// Активация/деактивация редактора
function enableEditor() {
    addStageBtn.disabled = false;
    saveJsonBtn.disabled = false;
    loadJsonBtn.disabled = false;
    document.querySelector(".editor-panel").style.opacity = "1";
}

function disableEditor() {
    addStageBtn.disabled = true;
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
                    <line x1="50%" y1="100%" x2="50%" y2="0%" stroke="#00CCAE" stroke-width="2"/>
                    <text x="50%" y="50%" fill="#555" font-size="12" text-anchor="middle">${option.text}</text>
                `;
                diagram.appendChild(svg);
            }
        });
    });
}

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

saveStageBtn.addEventListener("click", () => {
    const stageIndex = state.scenarios.findIndex(s => s.id === state.selectedStage);
    const stage = state.scenarios[stageIndex];
    stage.id = editStageId.value;
    stage.text = editStageText.value;
    stage.options = Array.from(editStageOptions.children).map(row => ({
        text: row.querySelector("input").value,
        next: row.querySelector("select").value
    }));
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
