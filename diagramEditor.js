const DiagramEditor = (function () {
    console.log("Loading DiagramEditor...");

    const MIN_SCALE = 0.3;
    const MAX_SCALE = 2;
    const STAGE_WIDTH = 200;
    const MIN_DISTANCE = 50;

    let diagramContainer = null;
    let stagePositions = new Map();
    let camera = { x: 0, y: 0, scale: 1 };
    let isDraggingCamera = false;
    let startDrag = { x: 0, y: 0 };
    let showArrows = true;
    let collapsedStages = new Set();
    let mode = "edit";
    let isDraggingStage = false;
    let stateRef = null;

    function init(containerId, state) {
        console.log("DiagramEditor.init called with containerId:", containerId);
        diagramContainer = document.getElementById(containerId);
        if (!diagramContainer) {
            throw new Error("Diagram container not found");
        }
        stateRef = state;

        const viewport = document.getElementById("diagram-viewport");
        if (!viewport) {
            throw new Error("Viewport not found");
        }

        bindViewportEvents(viewport);
    }

    function bindViewportEvents(viewport) {
        viewport.addEventListener("wheel", handleWheelEvent);
        viewport.addEventListener("mousedown", handleMouseDown);
        viewport.addEventListener("mousemove", handleMouseMove);
        viewport.addEventListener("mouseup", resetCameraDragging);
        viewport.addEventListener("mouseleave", resetCameraDragging);
    }

    function handleWheelEvent(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        camera.scale = Math.max(MIN_SCALE, Math.min(camera.scale * delta, MAX_SCALE));
        updateTransform();
    }

    function handleMouseDown(e) {
        if (e.button === 0 && !e.target.closest(".stage-card")) {
            isDraggingCamera = true;
            startDrag.x = e.clientX;
            startDrag.y = e.clientY;
        }
    }

    function handleMouseMove(e) {
        if (isDraggingCamera) {
            e.preventDefault();
            const dx = (e.clientX - startDrag.x) / camera.scale;
            const dy = (e.clientY - startDrag.y) / camera.scale;
            camera.x += dx;
            camera.y += dy;
            startDrag.x = e.clientX;
            startDrag.y = e.clientY;
            updateTransform();
        }
    }

    function resetCameraDragging() {
        isDraggingCamera = false;
    }

    function updateTransform() {
        if (!diagramContainer) return;
        diagramContainer.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`;
    }

    function autoAlign(state) {
        if (!state.scenarios || state.scenarios.length === 0) {
            console.warn("No scenarios to align.");
            // Базовое распределение, если сценариев нет
            state.scenarios.forEach((stage, index) => {
                stagePositions.set(stage.id, { x: 1500 + index * 300, y: 100 });
            });
            return;
        }

        const levels = new Map();
        const referencedStages = new Set(state.scenarios.flatMap(s => s.options.map(opt => opt.next).filter(Boolean)));
        let startStage = state.scenarios.find(s => !referencedStages.has(s.id));
        if (!startStage) {
            console.warn("No start stage found, using first scenario.");
            startStage = state.scenarios[0];
        }

        function assignLevel(stageId, level = 0) {
            if (!stageId || levels.has(stageId)) return;
            levels.set(stageId, level);
            const stage = state.scenarios.find(s => s.id === stageId);
            if (!stage || collapsedStages.has(stageId)) return;
            stage.options.forEach(opt => {
                if (opt.next) assignLevel(opt.next, level + 1);
            });
        }
        assignLevel(startStage.id);

        console.log("Levels assigned:", Array.from(levels.entries()));

        const stagesByLevel = Array.from(levels.entries()).reduce((acc, [stageId, level]) => {
            if (!acc[level]) acc[level] = [];
            acc[level].push(stageId);
            return acc;
        }, []);

        console.log("Stages by level:", stagesByLevel);

        if (stagesByLevel.length === 0) {
            console.warn("No levels assigned, using default positioning.");
            state.scenarios.forEach((stage, index) => {
                stagePositions.set(stage.id, { x: 1500 + index * 300, y: 100 });
            });
        } else {
            const stageWidth = 250;
            const levelHeight = 200;
            stagesByLevel.forEach((stageIds, level) => {
                const count = stageIds.length;
                const totalWidth = count * stageWidth;
                const startX = 1500 - totalWidth / 2;
                stageIds.forEach((stageId, index) => {
                    const x = startX + index * stageWidth;
                    const y = 100 + level * levelHeight;
                    stagePositions.set(stageId, { x, y });
                    console.log(`Position for stage ${stageId}: x=${x}, y=${y}`);
                });
            });
        }

        renderDiagram(state);
    }

    function checkCollision(x, y, currentStageId) {
        const stageHeight = 100 + 30 * (stateRef.scenarios.find(s => s.id === currentStageId)?.options.length || 0);

        for (const [stageId, pos] of stagePositions) {
            if (stageId === currentStageId) continue;
            const otherHeight = 100 + 30 * (stateRef.scenarios.find(s => s.id === stageId)?.options.length || 0);
            const dx = Math.abs(x - pos.x);
            const dy = Math.abs(y - pos.y);
            if (dx < STAGE_WIDTH + MIN_DISTANCE && dy < (stageHeight + otherHeight) / 2 + MIN_DISTANCE) {
                if (dx < STAGE_WIDTH + MIN_DISTANCE) {
                    x = pos.x + (x < pos.x ? -(STAGE_WIDTH + MIN_DISTANCE) : (STAGE_WIDTH + MIN_DISTANCE));
                }
                if (dy < (stageHeight + otherHeight) / 2 + MIN_DISTANCE) {
                    y = pos.y + (y < pos.y ? -((stageHeight + otherHeight) / 2 + MIN_DISTANCE) : ((stageHeight + otherHeight) / 2 + MIN_DISTANCE));
                }
            }
        }
        return { x, y };
    }

    function renderDiagram(state) {
        if (!diagramContainer) {
            console.error("DiagramEditor: diagramContainer is not initialized");
            return;
        }

        diagramContainer.innerHTML = "";
        state.activePath = state.activePath || [];

        state.scenarios.forEach((stage, index) => {
            if (!stagePositions.has(stage.id)) {
                stagePositions.set(stage.id, { x: 1500 + index * 300, y: 100 }); // Изменили, чтобы этапы не накладывались
            }
            const stageCard = createStageCard(stage, index, state);
            diagramContainer.appendChild(stageCard);
        });

        if (!isDraggingStage) {
            renderArrows(state);
        }
        updateTransform();
    }

    function createStageCard(stage, index, state) {
        const pos = stagePositions.get(stage.id);
        const stageCard = document.createElement("div");
        stageCard.className = "stage-card";
        stageCard.style.left = `${pos.x}px`;
        stageCard.style.top = `${pos.y}px`;

        if (state.selectedStage === stage.id) {
            stageCard.classList.add("selected");
        }
        if (state.activePath.includes(stage.id)) {
            stageCard.classList.add("active-path");
        }

        const isCollapsed = collapsedStages.has(stage.id);
        stageCard.innerHTML = `
            <div class="stage-header">
                <h3>${stage.id}</h3>
                <button class="toggle-btn">
                    <span class="material-icons">${isCollapsed ? "expand_more" : "expand_less"}</span>
                </button>
            </div>
            <p>${stage.text}</p>
            <div class="stage-options" style="display: ${isCollapsed ? 'none' : 'block'};"></div>
        `;

        stageCard.addEventListener("click", (e) => {
            e.stopPropagation();
            if (mode === "edit" && !state.isDragging) {
                state.openEditModal(index);
            } else if (mode === "select") {
                state.selectedStage = stage.id;
                renderDiagram(state);
            }
        });

        if (mode === "drag" || mode === "edit") {
            interact(stageCard).draggable({
                onstart: () => {
                    state.isDragging = true;
                    isDraggingStage = true;
                    hideArrows();
                },
                onmove: (event) => {
                    const target = event.target;
                    let x = (parseFloat(target.style.left) || pos.x) + event.dx / camera.scale;
                    let y = (parseFloat(target.style.top) || pos.y) + event.dy / camera.scale;
                    const adjustedPos = checkCollision(x, y, stage.id);
                    x = adjustedPos.x;
                    y = adjustedPos.y;
                    target.style.left = `${x}px`;
                    target.style.top = `${y}px`;
                    stagePositions.set(stage.id, { x, y });
                },
                onend: () => {
                    setTimeout(() => {
                        state.isDragging = false;
                        isDraggingStage = false;
                        displayArrows();
                        renderArrows(state);
                    }, 100);
                }
            });
        }

        const toggleBtn = stageCard.querySelector(".toggle-btn");
        toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (collapsedStages.has(stage.id)) {
                collapsedStages.delete(stage.id);
            } else {
                collapsedStages.add(stage.id);
            }
            autoAlign(state);
        });

        const optionsDiv = stageCard.querySelector(".stage-options");
        stage.options.forEach((option, optIndex) => {
            const optionBtn = document.createElement("div");
            optionBtn.className = "option-btn";
            if (state.activePath.includes(option.next)) {
                optionBtn.classList.add("active-path");
            }
            optionBtn.textContent = option.text;
            optionBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const path = getPathTo(stage.id, option.next, state.scenarios);
                if (path.length <= 1 && option.next) {
                    alert(`Ошибка: Связь "${option.next}" не найдена. Проверьте корректность данных.`);
                    state.activePath = [];
                } else {
                    state.activePath = path;
                    const nextStage = state.scenarios.find(s => s.id === option.next);
                    if (nextStage) {
                        const nextStageCard = Array.from(diagramContainer.querySelectorAll(".stage-card"))
                            .find(card => card.querySelector("h3").textContent === nextStage.id);
                        if (nextStageCard) {
                            nextStageCard.classList.add("highlighted");
                        }
                    }
                }
                renderDiagram(state);
            });
            optionsDiv.appendChild(optionBtn);
        });

        return stageCard;
    }

    function hideArrows() {
        const arrows = diagramContainer.querySelectorAll(".arrow, .arrow-tooltip");
        arrows.forEach(arrow => {
            arrow.style.display = "none";
        });
    }

    function displayArrows() {
        const arrows = diagramContainer.querySelectorAll(".arrow, .arrow-tooltip");
        arrows.forEach(arrow => {
            arrow.style.display = "";
        });
    }

    function renderArrows(state) {
        // Удаляем все существующие стрелки
        const existingArrows = diagramContainer.querySelectorAll(".arrow, .arrow-tooltip");
        existingArrows.forEach(arrow => arrow.remove());
        console.log("Cleared existing arrows.");

        if (!showArrows) return;

        state.scenarios.forEach((stage, stageIndex) => {
            if (collapsedStages.has(stage.id)) return;
            const stageCard = Array.from(diagramContainer.querySelectorAll(".stage-card"))
                .find(card => card.querySelector("h3").textContent === stage.id);
            if (!stageCard) return;

            const optionsDiv = stageCard.querySelector(".stage-options");
            const optionButtons = optionsDiv.querySelectorAll(".option-btn");

            stage.options.forEach((option, optIndex) => {
                // Пропускаем первую стрелку (первый вариант первого этапа)
                if (stageIndex === 0 && optIndex === 0) {
                    console.log(`Skipping arrow for first option of first stage: ${stage.id} -> ${option.next}`);
                    return;
                }

                const nextStage = state.scenarios.find(s => s.id === option.next);
                if (nextStage && !collapsedStages.has(nextStage.id)) {
                    const pos = stagePositions.get(stage.id);
                    const nextPos = stagePositions.get(nextStage.id);
                    const optionBtn = optionButtons[optIndex];

                    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    svg.className = "arrow";
                    svg.style.position = "absolute";
                    svg.style.zIndex = "-1";

                    const startX = pos.x + STAGE_WIDTH / 2;
                    const startY = pos.y + 50 + (optIndex + 1) * 30;
                    const endX = nextPos.x + STAGE_WIDTH / 2;
                    const endY = nextPos.y;

                    const minX = Math.min(startX, endX);
                    const minY = Math.min(startY, endY);
                    const maxX = Math.max(startX, endX);
                    const maxY = Math.max(startY, endY);
                    svg.style.left = `${minX}px`;
                    svg.style.top = `${minY}px`;
                    svg.style.width = `${maxX - minX}px`;
                    svg.style.height = `${maxY - minY}px`;

                    const strokeColor = state.activePath.includes(nextStage.id) ? "#28a745" : "#4A90E2";
                    svg.innerHTML = `
                        <line x1="${startX - minX}" y1="${startY - minY}" x2="${endX - minX}" y2="${endY - minY}" stroke="${strokeColor}" stroke-width="2"/>
                        <text x="${(startX + endX) / 2 - minX}" y="${(startY + endY) / 2 - minY}" fill="#555" font-size="12" text-anchor="middle">${option.text}</text>
                    `;
                    diagramContainer.appendChild(svg);

                    const tooltip = document.createElement("div");
                    tooltip.className = "arrow-tooltip";
                    tooltip.textContent = nextStage.text;
                    tooltip.style.left = `${(startX + endX) / 2}px`;
                    tooltip.style.top = `${(startY + endY) / 2 - 20}px`;
                    diagramContainer.appendChild(tooltip);

                    svg.addEventListener("mouseover", () => {
                        tooltip.style.display = "block";
                    });
                    svg.addEventListener("mouseout", () => {
                        tooltip.style.display = "none";
                    });

                    console.log(`Rendered arrow from ${stage.id} to ${nextStage.id}`);
                }
            });
        });
    }

    function getPathTo(fromId, toId, scenarios) {
        const path = [];
        if (!fromId || !scenarios.some(s => s.id === fromId)) return path;
        path.push(fromId);

        function findPath(currentId) {
            if (currentId === toId) return true;
            const stage = scenarios.find(s => s.id === currentId);
            if (!stage) return false;
            for (const option of stage.options) {
                if (option.next && scenarios.some(s => s.id === option.next)) {
                    path.push(option.next);
                    if (option.next === toId || findPath(option.next)) {
                        return true;
                    }
                    path.pop();
                }
            }
            return false;
        }

        findPath(fromId);
        return path;
    }

    function toggleArrows() {
        showArrows = !showArrows;
    }

    function setMode(newMode) {
        mode = newMode;
        renderDiagram(stateRef);
    }

    console.log("DiagramEditor loaded successfully");
    return {
        init,
        autoAlign,
        renderDiagram,
        toggleArrows,
        setMode
    };
})();
