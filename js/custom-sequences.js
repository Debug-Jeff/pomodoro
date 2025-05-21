/**
 * Custom Sequences functionality for the Pomodoro app
 * Handles creation and management of custom timer sequences
 */

// DOM elements for the modal
const sequenceModalElement = document.getElementById('sequence-modal');
const closeSequenceModalButton = document.getElementById('close-sequence-modal');
const manageSequencesButton = document.getElementById('manage-custom-sequences'); // Button on home page

// Modal Views
const sequenceListViewElement = document.getElementById('sequence-list-view');
const sequenceEditorViewElement = document.getElementById('sequence-editor-view');

// List View Elements
const savedSequencesContainerElement = document.getElementById('saved-sequences');
const createNewSequenceButton = document.getElementById('create-sequence-btn'); // From list view to editor
const cancelModalFromListButton = document.getElementById('cancel-sequence-modal-btn'); // Close modal from list view

// Editor View Elements
const sequenceEditorTitleElement = document.getElementById('sequence-editor-title');
const sequenceNameInputElement = document.getElementById('sequence-name-input');
const sequenceStepsEditorListElement = document.getElementById('sequence-steps-editor-list');
const addFocusStepButton = document.getElementById('add-focus-btn');
const addShortBreakStepButton = document.getElementById('add-short-break-btn');
const addLongBreakStepButton = document.getElementById('add-long-break-btn');
const saveEditedSequenceButton = document.getElementById('save-sequence-btn');
const cancelEditViewButton = document.getElementById('cancel-edit-sequence-btn'); // Back to list from editor
const backToListFromEditorButton = document.getElementById('back-to-list-view-btn'); // Optional if you add this

// Main page display for active sequence
const activeSequenceDisplayElement = document.getElementById('custom-sequence-selector');
const activeSequenceNameDisplayElement = document.getElementById('active-sequence-name');
const activeSequenceStepsContainerElement = document.getElementById('sequence-steps'); // Dots/numbers
const editActiveSequenceButton = document.getElementById('edit-active-sequence-btn');
const clearActiveSequenceButton = document.getElementById('clear-active-sequence-btn');

let allSequences = [];
let currentActiveSequenceId = null;
let sequenceBeingEdited = null; // Object of the sequence being edited, or null for new
let stepsForCurrentEdit = [];


function initCustomSequencesModule() {
  loadSequencesStateFromStorage();

  if (manageSequencesButton) manageSequencesButton.addEventListener('click', openSequencesModal);
  if (closeSequenceModalButton) closeSequenceModalButton.addEventListener('click', closeSequencesModal);
  if (cancelModalFromListButton) cancelModalFromListButton.addEventListener('click', closeSequencesModal);
  if (createNewSequenceButton) createNewSequenceButton.addEventListener('click', transitionToEditorForNew);

  if (addFocusStepButton) addFocusStepButton.addEventListener('click', () => addStepToEditor('focus'));
  if (addShortBreakStepButton) addShortBreakStepButton.addEventListener('click', () => addStepToEditor('shortBreak'));
  if (addLongBreakStepButton) addLongBreakStepButton.addEventListener('click', () => addStepToEditor('longBreak'));

  if (saveEditedSequenceButton) saveEditedSequenceButton.addEventListener('click', commitEditedSequence);
  if (cancelEditViewButton) cancelEditViewButton.addEventListener('click', transitionToListingView);
  if (backToListFromEditorButton) backToListFromEditorButton.addEventListener('click', transitionToListingView);


  if (editActiveSequenceButton) editActiveSequenceButton.addEventListener('click', handleEditActiveSequence);
  if (clearActiveSequenceButton) clearActiveSequenceButton.addEventListener('click', handleClearActiveSequence);

  updateActiveSequenceDisplayOnPage();
}

function loadSequencesStateFromStorage() {
  allSequences = loadData('sequences', []);
  currentActiveSequenceId = loadData('active_sequence_id', null);
}

function saveSequencesStateToStorage() {
  saveData('sequences', allSequences);
  saveData('active_sequence_id', currentActiveSequenceId);
  window.dispatchEvent(new CustomEvent('appSequencesUpdated', { detail: { sequences: allSequences, activeSequenceId: currentActiveSequenceId } }));
}

function openSequencesModal() {
  if (!sequenceModalElement) return;
  sequenceModalElement.classList.remove('hidden');
  transitionToListingView(); // Default to showing the list
  if (window.gsap && !prefersReducedMotion()) {
    gsap.fromTo(sequenceModalElement.querySelector('.glass-card'),
      { y: 25, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.6)" }
    );
  }
}

function closeSequencesModal() {
  if (!sequenceModalElement) return;
  sequenceBeingEdited = null;
  stepsForCurrentEdit = [];
  if (window.gsap && !prefersReducedMotion()) {
    gsap.to(sequenceModalElement.querySelector('.glass-card'), {
      y: 25, opacity: 0, scale: 0.97, duration: 0.25, ease: "power2.in",
      onComplete: () => sequenceModalElement.classList.add('hidden')
    });
  } else {
    sequenceModalElement.classList.add('hidden');
  }
}

function transitionToListingView() {
    if (!sequenceModalElement || !savedSequencesContainerElement) return;
    if (sequenceEditorViewElement) sequenceEditorViewElement.classList.add('hidden');
    if (sequenceListViewElement) sequenceListViewElement.classList.remove('hidden');
    renderSavedSequencesListToModal();
}

function transitionToEditorForNew() {
    sequenceBeingEdited = null;
    stepsForCurrentEdit = [];
    if (sequenceNameInputElement) sequenceNameInputElement.value = '';
    if (sequenceEditorTitleElement) sequenceEditorTitleElement.textContent = 'Create New Sequence';
    renderStepsInEditor();
    switchToEditorView();
}

function transitionToEditorForExisting(sequenceToEdit) {
    sequenceBeingEdited = { ...sequenceToEdit }; // Clone
    stepsForCurrentEdit = [...sequenceToEdit.steps]; // Deep copy steps
    if (sequenceNameInputElement) sequenceNameInputElement.value = sequenceBeingEdited.name;
    if (sequenceEditorTitleElement) sequenceEditorTitleElement.textContent = 'Edit Sequence';
    renderStepsInEditor();
    switchToEditorView();
}

function switchToEditorView() {
    if (!sequenceModalElement) return;
    if (sequenceListViewElement) sequenceListViewElement.classList.add('hidden');
    if (sequenceEditorViewElement) sequenceEditorViewElement.classList.remove('hidden');
}

function renderSavedSequencesListToModal() {
  if (!savedSequencesContainerElement) return;
  savedSequencesContainerElement.innerHTML = '';
  if (allSequences.length === 0) {
    savedSequencesContainerElement.innerHTML = `<p class="text-center text-[rgb(var(--muted-foreground-rgb))] py-5 text-sm">No custom sequences defined yet.</p>`;
    return;
  }
  allSequences.forEach(seq => {
    const item = document.createElement('div');
    item.className = 'bg-[rgba(var(--card-background-rgb),0.5)] hover:bg-[rgba(var(--primary-rgb),0.1)] rounded-lg p-4 mb-3 flex justify-between items-center transition-colors duration-150';
    const stepsHtml = seq.steps.map(s => {
        const iconMap = { focus: '🎯', shortBreak: '☕', longBreak: '🛌' };
        return `<span class="inline-flex items-center justify-center h-7 w-7 rounded-full bg-[rgba(var(--foreground-rgb),0.1)] text-xs mx-0.5" title="${s.type} (${s.duration}m)">${iconMap[s.type]}</span>`;
    }).join('');
    item.innerHTML = `
      <div class="flex-grow min-w-0">
        <h4 class="font-semibold text-md truncate text-[rgb(var(--primary-rgb))]">${seq.name}</h4>
        <div class="text-xs text-[rgb(var(--muted-foreground-rgb))] mt-1.5 flex flex-wrap gap-1">${stepsHtml || 'No steps'}</div>
      </div>
      <div class="flex space-x-1.5 ml-3 flex-shrink-0">
        <button class="use-btn p-2 rounded-full hover:bg-green-500/20 text-green-400 focus:outline-none focus:ring-2 focus:ring-green-500" title="Use Sequence" data-id="${seq.id}">▶️</button>
        <button class="edit-btn p-2 rounded-full hover:bg-blue-500/20 text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500" title="Edit Sequence" data-id="${seq.id}">✏️</button>
        <button class="delete-btn p-2 rounded-full hover:bg-red-500/20 text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500" title="Delete Sequence" data-id="${seq.id}">🗑️</button>
      </div>
    `;
    item.querySelector('.use-btn').addEventListener('click', () => { activateSequence(seq.id); closeSequencesModal(); });
    item.querySelector('.edit-btn').addEventListener('click', () => transitionToEditorForExisting(seq));
    item.querySelector('.delete-btn').addEventListener('click', () => deleteSequenceFromList(seq.id));
    savedSequencesContainerElement.appendChild(item);
  });
}

function addStepToEditor(type) {
  const settings = loadData('settings', DEFAULT_SETTINGS);
  const durationMap = { focus: settings.focusDuration, shortBreak: settings.shortBreakDuration, longBreak: settings.longBreakDuration };
  stepsForCurrentEdit.push({ type, duration: durationMap[type] || 25 });
  renderStepsInEditor();
}

function removeStepFromEditorByIndex(index) {
  stepsForCurrentEdit.splice(index, 1);
  renderStepsInEditor();
}

function renderStepsInEditor() {
  if (!sequenceStepsEditorListElement) return;
  sequenceStepsEditorListElement.innerHTML = '';
  if (stepsForCurrentEdit.length === 0) {
    sequenceStepsEditorListElement.innerHTML = `<p class="text-center text-[rgb(var(--muted-foreground-rgb))] py-4 text-sm">Add steps using the buttons below.</p>`;
    return;
  }
  stepsForCurrentEdit.forEach((step, index) => {
    const item = document.createElement('div');
    item.className = 'sequence-editor-item bg-[rgba(var(--foreground-rgb),0.05)] p-2.5 rounded-md flex items-center justify-between mb-2 draggable-item';
    item.setAttribute('draggable', true); item.dataset.index = index; // Keep original index for reordering logic
    const colorMap = { focus: 'bg-indigo-500', shortBreak: 'bg-green-500', longBreak: 'bg-blue-500' };
    const nameMap = { focus: 'Focus', shortBreak: 'Short Break', longBreak: 'Long Break' };
    item.innerHTML = `
      <div class="flex items-center">
        <span class="drag-handle cursor-grab mr-3 text-[rgb(var(--muted-foreground-rgb))] hover:text-[rgb(var(--primary-rgb))]">⠿</span>
        <span class="w-2.5 h-2.5 rounded-full ${colorMap[step.type]} mr-2.5"></span>
        <span class="font-medium text-sm">${nameMap[step.type]}</span>
        <span class="ml-2 text-xs text-[rgb(var(--muted-foreground-rgb))]">(${step.duration} min)</span>
      </div>
      <button class="remove-step-btn p-1 rounded-full hover:bg-red-500/20 text-red-400" data-index="${index}" aria-label="Remove step">✕</button>
    `;
    item.querySelector('.remove-step-btn').addEventListener('click', () => removeStepFromEditorByIndex(index));
    sequenceStepsEditorListElement.appendChild(item);
  });
  makeEditorStepsDraggable();
}

let draggedStepElement = null;
function makeEditorStepsDraggable() {
    if (!sequenceStepsEditorListElement) return;
    const items = sequenceStepsEditorListElement.querySelectorAll('.draggable-item');
    items.forEach(item => {
        item.addEventListener('dragstart', e => {
            draggedStepElement = item;
            setTimeout(() => item.classList.add('opacity-50', 'ring-2', 'ring-[rgb(var(--primary-rgb))]'), 0);
            e.dataTransfer.effectAllowed = 'move';
        });
        item.addEventListener('dragend', () => {
            draggedStepElement.classList.remove('opacity-50', 'ring-2', 'ring-[rgb(var(--primary-rgb))]');
            draggedStepElement = null;
            reorderStepsArrayBasedOnDOM();
        });
        item.addEventListener('dragover', e => {
            e.preventDefault();
            const target = e.target.closest('.draggable-item');
            if (target && draggedStepElement && target !== draggedStepElement) {
                const rect = target.getBoundingClientRect();
                const isAfter = (e.clientY - rect.top) > (rect.height / 2);
                if (isAfter) sequenceStepsEditorListElement.insertBefore(draggedStepElement, target.nextSibling);
                else sequenceStepsEditorListElement.insertBefore(draggedStepElement, target);
            }
        });
    });
}

function reorderStepsArrayBasedOnDOM() {
    const newOrderedSteps = [];
    const domOrder = Array.from(sequenceStepsEditorListElement.querySelectorAll('.draggable-item'));
    domOrder.forEach(domEl => {
        const originalIndex = parseInt(domEl.dataset.index); // This assumes dataset.index maps to the old stepsForCurrentEdit
        // A more robust way would be to give each step a unique temp ID during edit
        newOrderedSteps.push(stepsForCurrentEdit[originalIndex]); // This is a simplified reorder
    });
    // If reordering complex, verify newOrderedSteps integrity before assigning
    if (newOrderedSteps.length === stepsForCurrentEdit.length) {
        stepsForCurrentEdit = newOrderedSteps;
        // Re-render to update dataset.index values for next drag operation
        renderStepsInEditor();
    } else {
        console.warn("Step reordering failed, array lengths mismatch. Re-rendering old order.");
        renderStepsInEditor(); // Re-render with old order to be safe
    }
}


function commitEditedSequence() {
  if (!sequenceNameInputElement || !sequenceNameInputElement.value.trim()) {
    if(window.showToast) window.showToast('Please enter a sequence name.', 'error'); return;
  }
  if (stepsForCurrentEdit.length === 0) {
    if(window.showToast) window.showToast('Sequence must have at least one step.', 'error'); return;
  }
  const name = sequenceNameInputElement.value.trim();
  if (sequenceBeingEdited) {
    const index = allSequences.findIndex(s => s.id === sequenceBeingEdited.id);
    if (index > -1) {
      allSequences[index].name = name;
      allSequences[index].steps = [...stepsForCurrentEdit];
      allSequences[index].updatedAt = new Date().toISOString();
    }
  } else {
    allSequences.push({ id: Date.now().toString(), name, steps: [...stepsForCurrentEdit], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  saveSequencesStateToStorage();
  transitionToListingView();
  if(window.showToast) window.showToast(`Sequence "${name}" saved successfully.`, 'success');
}

function activateSequence(sequenceId) {
  currentActiveSequenceId = sequenceId;
  saveSequencesStateToStorage();
  updateActiveSequenceDisplayOnPage();
  const sequence = allSequences.find(s => s.id === sequenceId);
  if (sequence && sequence.steps.length > 0 && window.timerJsSwitchToSequenceStep) {
    window.timerJsSwitchToSequenceStep(0); // Start sequence on timer
  }
  if(window.showToast && sequence) window.showToast(`Sequence "${sequence.name}" is now active.`, 'success');
}

function deleteSequenceFromList(sequenceId) {
  if (!confirm('Are you sure you want to delete this sequence?')) return;
  allSequences = allSequences.filter(s => s.id !== sequenceId);
  if (currentActiveSequenceId === sequenceId) {
    currentActiveSequenceId = null;
    updateActiveSequenceDisplayOnPage();
    if (window.timerJsSwitchMode) window.timerJsSwitchMode('focus'); // Revert timer to default
  }
  saveSequencesStateToStorage();
  renderSavedSequencesListToModal();
  if(window.showToast) window.showToast('Sequence deleted.', 'info');
}

function updateActiveSequenceDisplayOnPage() {
  if (!activeSequenceDisplayElement || !activeSequenceStepsContainerElement) {
      if(activeSequenceDisplayElement) activeSequenceDisplayElement.classList.add('hidden');
      return;
  }
  const sequence = allSequences.find(s => s.id === currentActiveSequenceId);
  if (!sequence) {
    activeSequenceDisplayElement.classList.add('hidden');
    return;
  }
  activeSequenceDisplayElement.classList.remove('hidden');
  if (activeSequenceNameDisplayElement) activeSequenceNameDisplayElement.textContent = sequence.name;
  renderActiveSequenceStepIndicators(sequence);
}

function renderActiveSequenceStepIndicators(sequence) {
    if (!activeSequenceStepsContainerElement) return;
    activeSequenceStepsContainerElement.innerHTML = '';
    const currentTimerStepIdx = window.getCurrentSequenceStepIndex ? window.getCurrentSequenceStepIndex() : 0;

    sequence.steps.forEach((step, index) => {
        const item = document.createElement('div');
        item.className = 'flex-shrink-0 rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center cursor-pointer transition-all duration-200 text-xs font-semibold';
        item.dataset.index = index;
        item.title = `${step.type.replace(/([A-Z])/g, ' $1').trim()} (${step.duration} min)`;
        const colors = { focus: 'bg-indigo-500', shortBreak: 'bg-green-500', longBreak: 'bg-blue-500' };
        item.classList.add(colors[step.type] || 'bg-gray-600', 'text-white');
        if (index === currentTimerStepIdx) {
            item.classList.add('ring-2', 'ring-offset-2', 'ring-offset-[rgb(var(--card-background-rgb))]', 'ring-white', 'scale-110', 'shadow-md');
        } else {
            item.classList.add('opacity-60', 'hover:opacity-100', 'hover:scale-105');
        }
        item.textContent = index + 1;
        item.addEventListener('click', () => {
            if (window.timerJsSwitchToSequenceStep) window.timerJsSwitchToSequenceStep(index);
        });
        activeSequenceStepsContainerElement.appendChild(item);
    });
}
// Called by timer.js when sequence step changes internally
window.updateCustomSequenceUI = updateActiveSequenceDisplayOnPage;

function handleEditActiveSequence() {
    if (!currentActiveSequenceId) { if(window.showToast) window.showToast('No sequence is active.', 'info'); return; }
    const seqToEdit = allSequences.find(s => s.id === currentActiveSequenceId);
    if (seqToEdit) { openSequencesModal(); transitionToEditorForExisting(seqToEdit); }
}

function handleClearActiveSequence() {
    if (!currentActiveSequenceId) { if(window.showToast) window.showToast('No sequence to clear.', 'info'); return; }
    if (confirm('Deactivate current sequence and return to standard Pomodoro mode?')) {
        currentActiveSequenceId = null;
        saveSequencesStateToStorage();
        updateActiveSequenceDisplayOnPage();
        if (window.timerJsSwitchMode) window.timerJsSwitchMode('focus'); // Revert timer
        if(window.showToast) window.showToast('Sequence deactivated.', 'success');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if relevant controls are on the page
    if (document.getElementById('manage-custom-sequences') || document.getElementById('custom-sequence-selector')) {
        initCustomSequencesModule();
    }
    if (window.globalUpdatePopOutTimerDisplayStatus) {
        globalUpdatePopOutTimerDisplayStatus();
    }
});

// Listen for timer events if it dispatches sequence step changes
window.addEventListener('timerSequenceStepChanged', (event) => {
    if (currentActiveSequenceId) { // Only if a sequence is active
        const sequence = allSequences.find(s => s.id === currentActiveSequenceId);
        if (sequence) renderActiveSequenceStepIndicators(sequence); // event.detail.currentStepIndex can be used
    }
});
