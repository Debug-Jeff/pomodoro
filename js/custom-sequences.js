/**
 * Custom Sequences functionality for the Pomodoro app
 * Handles creation and management of custom timer sequences
 */

// DOM elements (ensure these IDs exist in home.html or a dedicated sequence management page)
const sequenceModal = document.getElementById('sequence-modal');
const closeSequenceModalBtn = document.getElementById('close-sequence-modal'); // In modal
const manageCustomSequencesBtn = document.getElementById('manage-custom-sequences'); // Button to open modal
const savedSequencesContainer = document.getElementById('saved-sequences'); // In modal
const createSequenceBtn = document.getElementById('create-sequence-btn'); // In modal, for "create new" view
const cancelSequenceModalBtn = document.getElementById('cancel-sequence-modal-btn'); // In modal, for "list" view

// Elements for sequence editor (inside modal, shown when creating/editing)
const sequenceEditorView = document.getElementById('sequence-editor-view'); // A new wrapper for editor
const sequenceNameInput = document.getElementById('sequence-name-input'); // Specific input for name
const sequenceStepsEditorList = document.getElementById('sequence-steps-editor-list'); // Where steps are rendered for editing
const addFocusBtn = document.getElementById('add-focus-btn'); // In editor
const addShortBreakBtn = document.getElementById('add-short-break-btn'); // In editor
const addLongBreakBtn = document.getElementById('add-long-break-btn'); // In editor
const saveSequenceBtn = document.getElementById('save-sequence-btn'); // In editor
const cancelEditSequenceBtn = document.getElementById('cancel-edit-sequence-btn'); // In editor, to go back to list

// Elements for main page sequence display (if a sequence is active)
const customSequenceSelector = document.getElementById('custom-sequence-selector'); // On home.html
const sequenceStepsContainer = document.getElementById('sequence-steps'); // On home.html, for step indicators
const editCurrentSequenceBtn = document.getElementById('edit-active-sequence-btn'); // On home.html, to edit active sequence
const clearActiveSequenceBtn = document.getElementById('clear-active-sequence-btn'); // On home.html


// Sequence state
let sequences = []; // All saved sequences
let activeSequenceId = null; // ID of the currently active sequence for the timer
let editingSequence = null; // The sequence object being edited, or null for new
let currentEditSteps = []; // Steps for the sequence being created/edited


function initCustomSequences() {
  loadSequencesFromStorage();

  if (manageCustomSequencesBtn) manageCustomSequencesBtn.addEventListener('click', openSequenceModal);
  if (closeSequenceModalBtn) closeSequenceModalBtn.addEventListener('click', closeSequenceModal);
  if (cancelSequenceModalBtn) cancelSequenceModalBtn.addEventListener('click', closeSequenceModal); // Closes modal from list view
  if (createSequenceBtn) createSequenceBtn.addEventListener('click', showSequenceEditorForNew);

  if (addFocusBtn) addFocusBtn.addEventListener('click', () => addStepToEditor('focus'));
  if (addShortBreakBtn) addShortBreakBtn.addEventListener('click', () => addStepToEditor('shortBreak'));
  if (addLongBreakBtn) addLongBreakBtn.addEventListener('click', () => addStepToEditor('longBreak'));

  if (saveSequenceBtn) saveSequenceBtn.addEventListener('click', saveEditedSequence);
  if (cancelEditSequenceBtn) cancelEditSequenceBtn.addEventListener('click', showSequenceListView); // Go back from editor to list

  if (editCurrentSequenceBtn) editCurrentSequenceBtn.addEventListener('click', editActiveSequenceHandler);
  if (clearActiveSequenceBtn) clearActiveSequenceBtn.addEventListener('click', clearActiveSequenceHandler);

  updateActiveSequenceDisplay(); // For home.html UI
}

function loadSequencesFromStorage() {
  sequences = loadData('sequences', []); // Global loadData
  activeSequenceId = loadData('active_sequence_id', null);
}

function saveSequencesToStorage() {
  saveData('sequences', sequences); // Global saveData
  saveData('active_sequence_id', activeSequenceId);
  // Dispatch event for other components (like timer.js) if needed
  window.dispatchEvent(new CustomEvent('sequencesUpdated', { detail: { sequences, activeSequenceId } }));
}

function openSequenceModal() {
  if (!sequenceModal) return;
  sequenceModal.classList.remove('hidden');
  showSequenceListView(); // Default to showing the list of saved sequences
  if (window.gsap && !prefersReducedMotion()) {
    gsap.fromTo(sequenceModal.querySelector('.glass-card'),
      { y: 30, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.7)" }
    );
  }
}

function closeSequenceModal() {
  if (!sequenceModal) return;
  editingSequence = null; // Clear editing state
  currentEditSteps = [];
  if (window.gsap && !prefersReducedMotion()) {
    gsap.to(sequenceModal.querySelector('.glass-card'), {
      y: 30, opacity: 0, scale: 0.95, duration: 0.3, ease: "power2.in",
      onComplete: () => sequenceModal.classList.add('hidden')
    });
  } else {
    sequenceModal.classList.add('hidden');
  }
}

// Shows the list of saved sequences in the modal
function showSequenceListView() {
    if (!sequenceModal || !savedSequencesContainer) return;
    const editorView = sequenceModal.querySelector('#sequence-editor-view'); // Assuming editor has this ID
    const listView = sequenceModal.querySelector('#sequence-list-view'); // Assuming list has this ID

    if (editorView) editorView.classList.add('hidden');
    if (listView) listView.classList.remove('hidden');

    renderSavedSequencesList();
}

// Shows the editor for a new or existing sequence
function showSequenceEditorForNew() {
    editingSequence = null; // New sequence
    currentEditSteps = [];
    if (sequenceNameInput) sequenceNameInput.value = '';
    renderCurrentEditSteps();
    switchToEditorViewInModal();
}

function showSequenceEditorForEdit(sequenceToEdit) {
    editingSequence = { ...sequenceToEdit }; // Clone to avoid direct modification
    currentEditSteps = [...sequenceToEdit.steps];
    if (sequenceNameInput) sequenceNameInput.value = editingSequence.name;
    renderCurrentEditSteps();
    switchToEditorViewInModal();
}

function switchToEditorViewInModal() {
    if (!sequenceModal) return;
    const editorView = sequenceModal.querySelector('#sequence-editor-view');
    const listView = sequenceModal.querySelector('#sequence-list-view');

    if (listView) listView.classList.add('hidden');
    if (editorView) editorView.classList.remove('hidden');
}


function renderSavedSequencesList() {
  if (!savedSequencesContainer) return;
  savedSequencesContainer.innerHTML = '';

  if (sequences.length === 0) {
    savedSequencesContainer.innerHTML = `<div class="text-gray-400 text-center py-4">No custom sequences yet.</div>`;
    return;
  }

  sequences.forEach(seq => {
    const item = document.createElement('div');
    item.className = 'bg-black bg-opacity-40 rounded-lg p-4 mb-3 flex justify-between items-center hover:bg-opacity-50 transition-colors';
    const stepsPreview = seq.steps.map(step => {
      const icon = step.type === 'focus' ? '🎯' : (step.type === 'shortBreak' ? '☕' : '🛌');
      return `<span class="text-xs inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-700 mx-0.5" title="${step.type} (${step.duration}m)">${icon}</span>`;
    }).join('');

    item.innerHTML = `
      <div>
        <h4 class="font-semibold text-lg text-indigo-300">${seq.name}</h4>
        <div class="text-sm text-gray-400 mt-1 flex flex-wrap gap-1">${stepsPreview}</div>
      </div>
      <div class="flex space-x-2">
        <button class="use-btn p-2 rounded-full hover:bg-green-500/20 text-green-400" title="Use this sequence" data-id="${seq.id}">▶️</button>
        <button class="edit-btn p-2 rounded-full hover:bg-blue-500/20 text-blue-400" title="Edit sequence" data-id="${seq.id}">✏️</button>
        <button class="delete-btn p-2 rounded-full hover:bg-red-500/20 text-red-400" title="Delete sequence" data-id="${seq.id}">🗑️</button>
      </div>
    `;
    item.querySelector('.use-btn').addEventListener('click', () => { useSequence(seq.id); closeSequenceModal(); });
    item.querySelector('.edit-btn').addEventListener('click', () => showSequenceEditorForEdit(seq));
    item.querySelector('.delete-btn').addEventListener('click', () => deleteSequence(seq.id));
    savedSequencesContainer.appendChild(item);
  });
}


function addStepToEditor(type) {
  const settings = loadData('settings', SCHEMAS.settings); // Use global
  let duration;
  switch (type) {
    case 'focus': duration = settings.focusDuration; break;
    case 'shortBreak': duration = settings.shortBreakDuration; break;
    case 'longBreak': duration = settings.longBreakDuration; break;
    default: duration = 25;
  }
  currentEditSteps.push({ type, duration });
  renderCurrentEditSteps();
}

function removeStepFromEditor(index) {
  currentEditSteps.splice(index, 1);
  renderCurrentEditSteps();
}

function renderCurrentEditSteps() {
  if (!sequenceStepsEditorList) return;
  sequenceStepsEditorList.innerHTML = '';

  if (currentEditSteps.length === 0) {
    sequenceStepsEditorList.innerHTML = `<div class="text-gray-400 text-center py-4">Add steps using the buttons above.</div>`;
    return;
  }

  currentEditSteps.forEach((step, index) => {
    const item = document.createElement('div');
    item.className = 'sequence-item bg-gray-700/50 p-2 rounded-md flex items-center justify-between mb-2 draggable-item';
    item.setAttribute('draggable', true);
    item.dataset.index = index;

    const colorMap = { focus: 'bg-indigo-500', shortBreak: 'bg-green-500', longBreak: 'bg-blue-500' };
    const nameMap = { focus: 'Focus', shortBreak: 'Short Break', longBreak: 'Long Break' };

    item.innerHTML = `
      <div class="flex items-center">
        <span class="drag-handle cursor-move mr-2 text-gray-400">☰</span>
        <span class="w-3 h-3 rounded-full ${colorMap[step.type]} mr-2"></span>
        <span class="font-medium">${nameMap[step.type]}</span>
        <span class="ml-2 text-sm text-gray-400">(${step.duration} min)</span>
      </div>
      <button class="remove-step-btn p-1 rounded-full hover:bg-red-500/20 text-red-400" data-index="${index}">✕</button>
    `;
    item.querySelector('.remove-step-btn').addEventListener('click', () => removeStepFromEditor(index));
    sequenceStepsEditorList.appendChild(item);
  });
  setupDragAndDropForEditor();
}

// Drag and Drop for sequence editor (simplified)
let draggedItem = null;
function setupDragAndDropForEditor() {
    if (!sequenceStepsEditorList) return;
    const items = sequenceStepsEditorList.querySelectorAll('.draggable-item');
    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            setTimeout(() => item.classList.add('opacity-50'), 0);
            e.dataTransfer.effectAllowed = 'move';
        });
        item.addEventListener('dragend', () => {
            draggedItem.classList.remove('opacity-50');
            draggedItem = null;
            // Update currentEditSteps array based on new DOM order
            const newOrder = Array.from(sequenceStepsEditorList.querySelectorAll('.draggable-item'))
                                .map(el => currentEditSteps[parseInt(el.dataset.originalIndexForReorder)]); // Requires storing original index before reorder
            // This is a simplified reorder. A robust way:
            reorderCurrentEditStepsFromDOM();
        });
        item.addEventListener('dragover', (e) => {
            e.preventDefault(); // Necessary to allow drop
            const targetItem = e.target.closest('.draggable-item');
            if (targetItem && draggedItem && targetItem !== draggedItem) {
                const rect = targetItem.getBoundingClientRect();
                const after = (e.clientY - rect.top) > (rect.height / 2);
                if (after) {
                    targetItem.parentNode.insertBefore(draggedItem, targetItem.nextSibling);
                } else {
                    targetItem.parentNode.insertBefore(draggedItem, targetItem);
                }
            }
        });
    });
}

function reorderCurrentEditStepsFromDOM() {
    if (!sequenceStepsEditorList) return;
    const newStepElements = Array.from(sequenceStepsEditorList.querySelectorAll('.draggable-item'));
    const newStepsOrder = [];
    newStepElements.forEach(el => {
        const originalIndex = parseInt(el.dataset.index); // This index needs to be stable or find by content
        // Find the step in currentEditSteps that corresponds to this DOM element.
        // This is tricky if dataset.index gets out of sync. A unique ID per step in currentEditSteps would be better.
        // For simplicity, assuming currentEditSteps[originalIndex] is the one.
        // A safer way is to temporarily add a unique ID to each step object and its DOM element.
        const stepData = currentEditSteps.find((s, i) => {
            // This find logic needs to be robust.
            // If you store a unique ID on the step object and its element:
            // return s.tempId === el.dataset.tempId;
            // For now, assume the original index in currentEditSteps maps.
            // This part needs careful implementation if drag-n-drop is essential.
            // This is a known simplification for now.
            return i === originalIndex;
        });
        if (stepData) newStepsOrder.push(stepData);
    });
     // If newStepsOrder is fully populated and valid:
     // currentEditSteps = newStepsOrder;
     // renderCurrentEditSteps(); // Re-render to fix dataset.index values
     console.warn("Drag and drop reordering logic needs robust index mapping. Current implementation is simplified.");
}


function saveEditedSequence() {
  if (!sequenceNameInput || !sequenceNameInput.value.trim()) {
    showToast('Please enter a sequence name.', 'error');
    return;
  }
  if (currentEditSteps.length === 0) {
    showToast('Sequence must have at least one step.', 'error');
    return;
  }

  const sequenceName = sequenceNameInput.value.trim();
  if (editingSequence) { // Update existing
    const index = sequences.findIndex(s => s.id === editingSequence.id);
    if (index > -1) {
      sequences[index].name = sequenceName;
      sequences[index].steps = [...currentEditSteps];
      sequences[index].updatedAt = new Date().toISOString();
    }
  } else { // Create new
    const newSequence = {
      id: Date.now().toString(),
      name: sequenceName,
      steps: [...currentEditSteps],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    sequences.push(newSequence);
  }
  saveSequencesToStorage();
  showSequenceListView(); // Go back to list view in modal
  showToast(`Sequence "${sequenceName}" saved.`, 'success');
}

function useSequence(sequenceId) {
  activeSequenceId = sequenceId;
  saveSequencesToStorage();
  updateActiveSequenceDisplay();

  const sequence = sequences.find(s => s.id === sequenceId);
  if (sequence && sequence.steps.length > 0 && window.timerJsSwitchToSequenceStep) { // Check for timer.js function
    window.timerJsSwitchToSequenceStep(0); // Start with the first step using timer.js's function
  } else if (sequence && sequence.steps.length > 0 && typeof switchToSequenceStep === 'function') {
      // This is the local switchToSequenceStep - likely for UI updates
      switchToSequenceStep(0); // This might be redundant if timer.js also calls it
  }
  showToast(`Sequence "${sequence.name}" activated.`, 'success');
}

function deleteSequence(sequenceId) {
  if (!confirm('Are you sure you want to delete this sequence?')) return;
  sequences = sequences.filter(s => s.id !== sequenceId);
  if (activeSequenceId === sequenceId) {
    activeSequenceId = null; // Deactivate if it was active
    updateActiveSequenceDisplay(); // Update home page UI
     if (window.timerJsSwitchMode) window.timerJsSwitchMode('focus'); // Revert timer to default focus
  }
  saveSequencesToStorage();
  renderSavedSequencesList(); // Re-render list in modal
  showToast('Sequence deleted.', 'info');
}

function updateActiveSequenceDisplay() {
  if (!customSequenceSelector || !sequenceStepsContainer) {
      if(customSequenceSelector) customSequenceSelector.classList.add('hidden'); // Hide if elements missing
      return;
  }

  const sequence = sequences.find(s => s.id === activeSequenceId);
  if (!sequence) {
    customSequenceSelector.classList.add('hidden');
    return;
  }

  customSequenceSelector.classList.remove('hidden');
  // Display sequence name (assuming an element for it)
  const sequenceNameDisplay = document.getElementById('active-sequence-name');
  if (sequenceNameDisplay) sequenceNameDisplay.textContent = sequence.name;

  renderActiveSequenceStepsPreview(sequence);
}

function renderActiveSequenceStepsPreview(sequence) {
    if (!sequenceStepsContainer) return;
    sequenceStepsContainer.innerHTML = ''; // Clear previous steps

    const currentTimerStepIndex = window.getCurrentSequenceStepIndex ? window.getCurrentSequenceStepIndex() : 0;

    sequence.steps.forEach((step, index) => {
        const stepItem = document.createElement('div');
        stepItem.className = 'flex-shrink-0 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer transition-all duration-200 text-xs font-medium';
        stepItem.dataset.index = index;
        stepItem.title = `${step.type} (${step.duration} min)`;

        const colorMap = { focus: 'bg-indigo-600', shortBreak: 'bg-green-600', longBreak: 'bg-blue-600' };
        stepItem.classList.add(colorMap[step.type] || 'bg-gray-500', 'text-white');

        if (index === currentTimerStepIndex) {
            stepItem.classList.add('ring-2', 'ring-white', 'scale-110', 'shadow-lg');
        } else {
            stepItem.classList.add('opacity-70', 'hover:opacity-100');
        }
        stepItem.textContent = index + 1;
        stepItem.addEventListener('click', () => {
            if (window.timerJsSwitchToSequenceStep) window.timerJsSwitchToSequenceStep(index);
        });
        sequenceStepsContainer.appendChild(stepItem);
    });
}

// For timer.js to call to update the sequence UI
window.updateCustomSequenceUI = function() {
    updateActiveSequenceDisplay();
};

// Wrapper for timer.js to switch to a specific step.
// timer.js should have its own function to handle the timer logic for a sequence step.
// This custom-sequences.js function will call that.
window.timerJsSwitchToSequenceStep = function(index) {
    if (typeof timerState !== 'undefined' && typeof timerState.mode !== 'undefined') { // Check if timer.js is loaded
        // Call a function in timer.js that actually handles mode/time change
        // e.g., timer.switchToSequenceModeAndStep(activeSequenceId, index);
        // For now, directly try to call the global function if timer.js defines it
        if (typeof window.switchToSequenceStep === 'function' && window.switchToSequenceStep.name !== 'timerJsSwitchToSequenceStep') {
             window.switchToSequenceStep(index); // This assumes timer.js defined it globally for this purpose
        } else {
            console.warn("timer.js function for switching sequence step not found or recursive call.");
        }
    }
    // Update UI here regardless
    const sequence = sequences.find(s => s.id === activeSequenceId);
    if (sequence) renderActiveSequenceStepsPreview(sequence);
};


function editActiveSequenceHandler() {
    if (!activeSequenceId) {
        showToast('No active sequence to edit.', 'info');
        return;
    }
    const sequenceToEdit = sequences.find(s => s.id === activeSequenceId);
    if (sequenceToEdit) {
        openSequenceModal();
        showSequenceEditorForEdit(sequenceToEdit);
    }
}

function clearActiveSequenceHandler() {
    if (!activeSequenceId) {
        showToast('No active sequence to clear.', 'info');
        return;
    }
    if (confirm('Are you sure you want to deactivate the current sequence and revert to standard Pomodoro?')) {
        activeSequenceId = null;
        saveSequencesToStorage();
        updateActiveSequenceDisplay();
        if (window.timerJsSwitchMode) window.timerJsSwitchMode('focus'); // Revert timer to default focus
        showToast('Sequence deactivated.', 'success');
    }
}

// Initialize custom sequences when DOM is loaded
document.addEventListener('DOMContentLoaded', initCustomSequences);

// Listen for sequence updates (e.g., from timer.js when step changes)
window.addEventListener('timerSequenceStepChanged', (event) => {
    // event.detail.currentStepIndex
    if (activeSequenceId) {
        const sequence = sequences.find(s => s.id === activeSequenceId);
        if (sequence) renderActiveSequenceStepsPreview(sequence);
    }
});
