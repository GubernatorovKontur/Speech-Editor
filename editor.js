// Состояние приложения
const state = {
    scenarios: [],
    user: null,
    selectedStage: null,
    activePath: [],
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
const editStageModal = document.getElementById("edit-stage-modal");
const editStageId = document.getElementById("edit-stage-id");
const editStageText = document.getElementById("edit-stage-text");
const editStageOptions = document.getElementById("edit-stage-options");
const addOptionBtn = document.getElementById("add-option-btn");
const deleteStageBtn = document.getElementById("delete-stage-btn");
const saveStageBtn = document.getElementById("save-stage-btn");
const cancelStageBtn = document.getElementById("cancel-stage-btn");
const toggleArrowsBtn = document.getElementById("toggle-arrows-btn");
const selectModeBtn = document.getElementById("select-mode-btn");
const dragModeBtn = document.getElementById("drag-mode-btn");
const editModeBtn = document.getElementById("edit-mode-btn");

// Привязываем метод открытия модального окна к состоянию
state.openEditModal = function(index) {
    openEditModal(index);
};

// Инициализация
function init() {
    DiagramEditor.init("diagram");

    const savedFio = localStorage.getItem("userFio");
    if (savedFio) {
        state.user = savedFio;
        userFio.textContent = savedFio;
        enableEditor();
    } else {
        fioModal.classList.add("active");
        disableEditor();
    }

    const savedScenarios = localStorage.getItem("scenarios");
    if (savedScenarios) {
        state.scenarios = JSON.parse(savedScenarios);
        cleanScenarios();
    }

    state.scenarios.forEach((stage, index) => {
        if (!stage.id || stage.id.startsWith("stage_")) {
            stage.id = String(index + 1);
        }
    });

    DiagramEditor.autoAlign(state);
    DiagramEditor.renderDiagram(state);

    // Обработчики режимов
    selectModeBtn.addEventListener("click", () => {
        setMode("select");
    });
    dragModeBtn.addEventListener("click", () => {
        setMode("drag");
    });
    editModeBtn.addEventListener("click", () => {
        setMode("edit");
    });
}

function setMode(mode) {
    DiagramEditor.setMode(mode);
    selectModeBtn.classList.remove("active");
    dragModeBtn.classList.remove("active");
    editModeBtn.classList.remove("active");
    if (mode === "select") selectModeBtn.classList.add("active");
    else if (mode === "drag") dragModeBtn.classList.add("active");
    else if (mode === "edit") editModeBtn.classList.add("active");
}

function enableEditor() {
    addStageBtn.disabled = false;
    autoAlignBtn.disabled = false;
    editJsonBtn.disabled = false;
    saveJsonBtn.disabled = false;
    loadJsonBtn.disabled = false;
    toggleArrowsBtn.disabled = false;
    selectModeBtn.disabled = false;
    dragModeBtn.disabled = false;
    editModeBtn.disabled = false;
    document.querySelector(".editor-panel").style.opacity = "1";
}

function disableEditor() {
    addStageBtn.disabled = true;
    autoAlignBtn.disabled = true;
    editJsonBtn.disabled = true;
    saveJsonBtn.disabled = true;
    loadJsonBtn.disabled = true;
    toggleArrowsBtn.disabled = true;
    selectModeBtn.disabled = true;
    dragModeBtn.disabled = true;
    editModeBtn.disabled = true;
    document.querySelector(".editor-panel").style.opacity = "0.5";
}

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

function cleanScenarios() {
    const stageIds = state.scenarios.map(s => s.id);
    state.scenarios.forEach(stage => {
        stage.options = stage.options.filter(opt => !opt.next || stageIds.includes(opt.next));
    });
}

editJsonBtn.addEventListener("click", () => {
    jsonEditor.value = JSON.stringify(state.scenarios, null, 2);
    editJsonModal.classList.add("active");
});

applyJsonBtn.addEventListener("click", () => {
    try {
        state.scenarios = JSON.parse(jsonEditor.value);
        cleanScenarios();
        state.scenarios.forEach((stage, index) => {
            if (!stage.id) {
                stage.id = String(index + 1);
            }
        });
        localStorage.setItem("scenarios", JSON.stringify(state.scenarios));
        DiagramEditor.autoAlign(state);
        DiagramEditor.renderDiagram(state);
        editJsonModal.classList.remove("active");
    } catch (error) {
        alert("Ошибка в JSON: " + error.message);
    }
});

cancelJsonBtn.addEventListener("click", () => {
    editJsonModal.classList.remove("active");
});

autoAlignBtn.addEventListener("click", () => {
    DiagramEditor.autoAlign(state);
});

toggleArrowsBtn.addEventListener("click", () => {
    DiagramEditor.toggleArrows();
    DiagramEditor.renderDiagram(state);
});

addStageBtn.addEventListener("click", () => {
    const newId = String(state.scenarios.length + 1);
    state.scenarios.push({
        id: newId,
        text: "Новый этап",
        options: []
    });
    cleanScenarios();
    localStorage.setItem("scenarios", JSON.stringify(state.scenarios));
    DiagramEditor.autoAlign(state);
    DiagramEditor.renderDiagram(state);
});

saveJsonBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.scenarios, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scenarios.json";
    a.click();
    URL.revokeObjectURL(url);
});

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
                state.scenarios.forEach((stage, index) => {
                    if (!stage.id) {
                        stage.id = String(index + 1);
                    }
                });
                localStorage.setItem("scenarios", JSON.stringify(state.scenarios));
                DiagramEditor.autoAlign(state);
                DiagramEditor.renderDiagram(state);
            } catch (error) {
                alert("Ошибка загрузки JSON: " + error.message);
            }
        };
        reader.readAsText(file);
    }
});

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
    DiagramEditor.renderDiagram(state);
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
    state.scenarios.splice(stageIndex, 1);
    cleanScenarios();
    localStorage.setItem("scenarios", JSON.stringify(state.scenarios));
    state.selectedStage = null;
    editStageModal.classList.remove("active");
    DiagramEditor.autoAlign(state);
    DiagramEditor.renderDiagram(state);
});

saveStageBtn.addEventListener("click", () => {
    const stageIndex = state.scenarios.findIndex(s => s.id === state.selectedStage);
    const stage = state.scenarios[stageIndex];
    const oldId = stage.id;
    stage.id = editStageId.value || String(stageIndex + 1);
    stage.text = editStageText.value;
    stage.options = Array.from(editStageOptions.children).map(row => ({
        text: row.querySelector("input").value,
        next: row.querySelector("select").value
    }));
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
    DiagramEditor.autoAlign(state);
    DiagramEditor.renderDiagram(state);
});

cancelStageBtn.addEventListener("click", () => {
    state.selectedStage = null;
    editStageModal.classList.remove("active");
    DiagramEditor.renderDiagram(state);
});

init();
