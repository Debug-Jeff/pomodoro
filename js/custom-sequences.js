/**
 * Custom Sequences functionality for the Pomodoro app
 * Handles creation and management of custom timer sequences
 */

// DOM elements
const sequenceModal = document.getElementById('sequence-modal');
const closeSequenceModalBtn = document.getElementById('close-sequence-modal');
const sequenceList = document.getElementById('sequence-list');
const addFocusBtn = document.getElementById('add-focus-btn');
const addShortBreakBtn = document.getElementById('add-short-break-btn');
const addLongBreakBtn = document.getElementById('add-long-break-btn');
const saveSequenceBtn = document.getElementById('save-sequence-btn');
const cancelSequenceBtn = document.getElementById('cancel-sequence-btn');
const manageCustomSequencesBtn = document.getElementById('manage-custom-sequences');
const savedSequencesContainer = document.getElementById('saved-sequences');
const createSequenceBtn = document.getElementById('create-sequence-btn');
const cancelSequenceModalBtn = document.getElementById('cancel-sequence-modal-btn');
const customSequenceSelector = document.getElementById('custom-sequence-selector');
const sequenceStepsContainer = document.getElementById('sequence-steps');
const editSequenceBtn = document.getElementById('edit-sequence-btn');

// Sequence state
let sequences = [];
let currentSequence = null;
let editingSequence = null;
let currentSequenceSteps = [];

// Initialize custom sequences
function initCustomSequences() {
  // Load sequences from localStorage
  loadSequences();
  
  // Set up event listeners
  if (manageCustomSequencesBtn) {
    manageCustomSequencesBtn.addEventListener('click', openSequenceModal);
  }
  
  if (closeSequenceModalBtn) {
    closeSequenceModalBtn.addEventListener('click', closeSequenceModal);
  }
  
  if (cancelSequenceBtn) {
    cancelSequenceBtn.addEventListener('click', closeSequenceModal);
  }
  
  if (cancelSequenceModalBtn) {
    cancelSequenceModalBtn.addEventListener('click', closeSequenceModal);
  }
  
  if (addFocusBtn) {
    addFocusBtn.addEventListener('click', () => addSequenceStep('focus'));
  }
  
  if (addShortBreakBtn) {
    addShortBreakBtn.addEventListener('click', () => addSequenceStep('shortBreak'));
  }
  
  if (addLongBreakBtn) {
    addLongBreakBtn.addEventListener('click', () => addSequenceStep('longBreak'));
  }
  
  if (saveSequenceBtn) {
    saveSequenceBtn.addEventListener('click', saveSequence);
  }
  
  if (createSequenceBtn) {
    createSequenceBtn.addEventListener('click', createNewSequence);
  }
  
  if (editSequenceBtn) {
    editSequenceBtn.addEventListener('click', editCurrentSequence);
  }
  
  // Render saved sequences
  renderSavedSequences();
  
  // Check if there's a current sequence
  if (currentSequence) {
    showCustomSequenceSelector();
  }
}

// Load sequences from localStorage
function loadSequences() {
  try {
    const storedSequences = localStorage.getItem(`${APP_NAME}_sequences`);
    sequences = storedSequences ? JSON.parse(storedSequences) : [];
    
    const storedCurrentSequence = localStorage.getItem(`${APP_NAME}_current_sequence`);
    currentSequence = storedCurrentSequence ? JSON.parse(storedCurrentSequence) : null;
    
    if (currentSequence) {
      currentSequenceSteps = currentSequence.steps;
    }
  } catch (error) {
    console.error('Error loading sequences:', error);
    sequences = [];
    currentSequence = null;
    currentSequenceSteps = [];
  }
}

// Save sequences to localStorage
function saveSequences() {
  try {
    localStorage.setItem(`${APP_NAME}_sequences`, JSON.stringify(sequences));
    localStorage.setItem(`${APP_NAME}_current_sequence`, currentSequence ? JSON.stringify(currentSequence) : null);
  } catch (error) {
    console.error('Error saving sequences:', error);
  }
}

// Open sequence modal
function openSequenceModal() {
  if (!sequenceModal) return;
  
  sequenceModal.classList.remove('hidden');
  renderSavedSequences();
  
  // Animate modal opening
  if (window.gsap) {
    const modalContent = sequenceModal.querySelector('.glass-card');
    if (modalContent) {
      gsap.fromTo(modalContent,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }
}

// Close sequence modal
function closeSequenceModal() {
  if (!sequenceModal) return;
  
  // Animate modal closing
  if (window.gsap) {
    const modalContent = sequenceModal.querySelector('.glass-card');
    if (modalContent) {
      gsap.to(modalContent, {
        y: 50,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          sequenceModal.classList.add('hidden');
          editingSequence = null;
        }
      });
    } else {
      sequenceModal.classList.add('hidden');
      editingSequence = null;
    }
  } else {
    sequenceModal.classList.add('hidden');
    editingSequence = null;
  }
}

// Render saved sequences
function renderSavedSequences() {
  if (!savedSequencesContainer) return;
  
  // Clear container
  savedSequencesContainer.innerHTML = '';
  
  if (sequences.length === 0) {
    savedSequencesContainer.innerHTML = `
      <div class="text-gray-400 text-center py-4">No custom sequences yet</div>
    `;
    return;
  }
  
  // Add sequences to container
  sequences.forEach(sequence => {
    const sequenceItem = document.createElement('div');
    sequenceItem.className = 'bg-black bg-opacity-30 rounded-lg p-3 mb-3';
    
    // Create sequence steps preview
    const stepsPreview = sequence.steps.map(step => {
      const icon = step.type === 'focus' ? '🔴' : (step.type === 'shortBreak' ? '🟢' : '🔵');
      return `<span class="inline-block mx-1">${icon}</span>`;
    }).join('');
    
    sequenceItem.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <h4 class="font-medium">${sequence.name}</h4>
          <div class="text-sm text-gray-400 mt-1">
            ${stepsPreview}
          </div>
        </div>
        <div class="flex space-x-2">
          <button class="sequence-use-btn p-1 rounded hover:bg-indigo-700 transition-colors" title="Use this sequence">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button class="sequence-edit-btn p-1 rounded hover:bg-blue-700 transition-colors" title="Edit sequence">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button class="sequence-delete-btn p-1 rounded hover:bg-red-700 transition-colors" title="Delete sequence">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    `;
    
    // Add event listeners
    const useBtn = sequenceItem.querySelector('.sequence-use-btn');
    if (useBtn) {
      useBtn.addEventListener('click', () => useSequence(sequence));
    }
    
    const editBtn = sequenceItem.querySelector('.sequence-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => editSequence(sequence));
    }
    
    const deleteBtn = sequenceItem.querySelector('.sequence-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => deleteSequence(sequence.id));
    }
    
    savedSequencesContainer.appendChild(sequenceItem);
  });
}

// Create new sequence
function createNewSequence() {
  editingSequence = null;
  currentSequenceSteps = [];
  
  // Show sequence editor
  showSequenceEditor();
}

// Edit sequence
function editSequence(sequence) {
  editingSequence = sequence;
  currentSequenceSteps = [...sequence.steps];
  
  // Show sequence editor
  showSequenceEditor();
}

// Edit current sequence
function editCurrentSequence() {
  if (!currentSequence) return;
  
  editingSequence = currentSequence;
  currentSequenceSteps = [...currentSequence.steps];
  
  // Show sequence editor
  openSequenceModal();
  showSequenceEditor();
}

// Show sequence editor
function showSequenceEditor() {
  if (!sequenceList) return;
  
  // Update UI for editing
  if (savedSequencesContainer) {
    savedSequencesContainer.classList.add('hidden');
  }
  
  if (createSequenceBtn) {
    createSequenceBtn.classList.add('hidden');
  }
  
  if (cancelSequenceModalBtn) {
    cancelSequenceModalBtn.classList.add('hidden');
  }
  
  sequenceList.classList.remove('hidden');
  
  if (addFocusBtn && addFocusBtn.parentElement) {
    addFocusBtn.parentElement.classList.remove('hidden');
  }
  
  if (saveSequenceBtn && saveSequenceBtn.parentElement) {
    saveSequenceBtn.parentElement.classList.remove('hidden');
  }
  
  // Render sequence steps
  renderSequenceSteps();
}

// Render sequence steps
function renderSequenceSteps() {
  if (!sequenceList) return;
  
  // Clear list
  sequenceList.innerHTML = '';
  
  // Add name input if editing
  if (editingSequence === null) {
    const nameInput = document.createElement('div');
    nameInput.className = 'mb-4';
    nameInput.innerHTML = `
      <label for="sequence-name" class="block text-sm font-medium text-gray-300 mb-1">Sequence Name</label>
      <input type="text" id="sequence-name" class="w-full px-3 py-2 bg-black bg-opacity-30 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="My Custom Sequence">
    `;
    sequenceList.appendChild(nameInput);
  } else {
    const nameInput = document.createElement('div');
    nameInput.className = 'mb-4';
    nameInput.innerHTML = `
      <label for="sequence-name" class="block text-sm font-medium text-gray-300 mb-1">Sequence Name</label>
      <input type="text" id="sequence-name" class="w-full px-3 py-2 bg-black bg-opacity-30 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500" value="${editingSequence.name}">
    `;
    sequenceList.appendChild(nameInput);
  }
  
  // Add steps header
  const stepsHeader = document.createElement('div');
  stepsHeader.className = 'flex justify-between items-center mb-2';
  stepsHeader.innerHTML = `
    <h4 class="font-medium">Sequence Steps</h4>
    <div class="text-sm text-gray-400">Drag to reorder</div>
  `;
  sequenceList.appendChild(stepsHeader);
  
  // Add steps container
  const stepsContainer = document.createElement('div');
  stepsContainer.id = 'sequence-steps-editor';
  stepsContainer.className = 'space-y-2';
  
  if (currentSequenceSteps.length === 0) {
    stepsContainer.innerHTML = `
      <div class="text-gray-400 text-center py-4">
        Add steps to your sequence using the buttons below
      </div>
    `;
  } else {
    currentSequenceSteps.forEach((step, index) => {
      const stepItem = document.createElement('div');
      stepItem.className = 'sequence-item';
      stepItem.dataset.index = index;
      
      let stepColor = '';
      let stepName = '';
      
      switch (step.type) {
        case 'focus':
          stepColor = 'bg-indigo-600';
          stepName = 'Focus';
          break;
        case 'shortBreak':
          stepColor = 'bg-green-600';
          stepName = 'Short Break';
          break;
        case 'longBreak':
          stepColor = 'bg-blue-600';
          stepName = 'Long Break';
          break;
      }
      
      stepItem.innerHTML = `
        <div class="sequence-handle mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
          </svg>
        </div>
        <div class="flex-grow flex items-center">
          <div class="w-3 h-3 rounded-full ${stepColor} mr-2"></div>
          <span>${stepName}</span>
          <span class="ml-2 text-sm text-gray-400">${step.duration} min</span>
        </div>
        <button class="sequence-step-delete p-1 rounded hover:bg-red-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      `;
      
      // Add event listener for delete button
      const deleteBtn = stepItem.querySelector('.sequence-step-delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => removeSequenceStep(index));
      }
      
      stepsContainer.appendChild(stepItem);
    });
  }
  
  sequenceList.appendChild(stepsContainer);
  
  // Initialize drag and drop
  initDragAndDrop();
}

// Initialize drag and drop for sequence steps
function initDragAndDrop() {
  const stepsContainer = document.getElementById('sequence-steps-editor');
  if (!stepsContainer) return;
  
  const stepItems = stepsContainer.querySelectorAll('.sequence-item');
  if (stepItems.length <= 1) return;
  
  stepItems.forEach(item => {
    const handle = item.querySelector('.sequence-handle');
    if (!handle) return;
    
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      
      const startY = e.clientY;
      const startIndex = parseInt(item.dataset.index);
      let currentIndex = startIndex;
      
      // Add dragging class
      item.classList.add('bg-gray-700');
      
      // Mouse move handler
      const handleMouseMove = (moveEvent) => {
        const deltaY = moveEvent.clientY - startY;
        const itemHeight = item.offsetHeight;
        
        // Calculate new position
        const newIndex = Math.max(0, Math.min(currentSequenceSteps.length - 1, startIndex + Math.round(deltaY / itemHeight)));
        
        if (newIndex !== currentIndex) {
          // Reorder steps
          const step = currentSequenceSteps[currentIndex];
          currentSequenceSteps.splice(currentIndex, 1);
          currentSequenceSteps.splice(newIndex, 0, step);
          
          // Update current index
          currentIndex = newIndex;
          
          // Re-render steps
          renderSequenceSteps();
        }
      };
      
      // Mouse up handler
      const handleMouseUp = () => {
        // Remove dragging class
        item.classList.remove('bg-gray-700');
        
        // Remove event listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      // Add event listeners
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });
  });
}

// Add sequence step
function addSequenceStep(type) {
  const settings = getSettings();
  
  let duration = 25;
  switch (type) {
    case 'focus':
      duration = settings.focusDuration;
      break;
    case 'shortBreak':
      duration = settings.shortBreakDuration;
      break;
    case 'longBreak':
      duration = settings.longBreakDuration;
      break;
  }
  
  currentSequenceSteps.push({
    type,
    duration
  });
  
  // Re-render steps
  renderSequenceSteps();
}

// Remove sequence step
function removeSequenceStep(index) {
  currentSequenceSteps.splice(index, 1);
  
  // Re-render steps
  renderSequenceSteps();
}

// Save sequence
function saveSequence() {
  // Get sequence name
  const nameInput = document.getElementById('sequence-name');
  if (!nameInput || !nameInput.value.trim()) {
    alert('Please enter a sequence name');
    return;
  }
  
  // Check if there are steps
  if (currentSequenceSteps.length === 0) {
    alert('Please add at least one step to your sequence');
    return;
  }
  
  // Create or update sequence
  if (editingSequence) {
    // Update existing sequence
    const index = sequences.findIndex(seq => seq.id === editingSequence.id);
    if (index !== -1) {
      sequences[index] = {
        ...editingSequence,
        name: nameInput.value.trim(),
        steps: [...currentSequenceSteps],
        updatedAt: new Date().toISOString()
      };
      
      // Update current sequence if it's the one being edited
      if (currentSequence && currentSequence.id === editingSequence.id) {
        currentSequence = sequences[index];
      }
    }
  } else {
    // Create new sequence
    const newSequence = {
      id: Date.now().toString(),
      name: nameInput.value.trim(),
      steps: [...currentSequenceSteps],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    sequences.push(newSequence);
  }
  
  // Save to localStorage
  saveSequences();
  
  // Reset state
  editingSequence = null;
  currentSequenceSteps = [];
  
  // Show saved sequences
  if (savedSequencesContainer) {
    savedSequencesContainer.classList.remove('hidden');
  }
  
  if (createSequenceBtn) {
    createSequenceBtn.classList.remove('hidden');
  }
  
  if (cancelSequenceModalBtn) {
    cancelSequenceModalBtn.classList.remove('hidden');
  }
  
  if (sequenceList) {
    sequenceList.classList.add('hidden');
  }
  
  if (addFocusBtn && addFocusBtn.parentElement) {
    addFocusBtn.parentElement.classList.add('hidden');
  }
  
  if (saveSequenceBtn && saveSequenceBtn.parentElement) {
    saveSequenceBtn.parentElement.classList.add('hidden');
  }
  
  // Render saved sequences
  renderSavedSequences();
}

// Use sequence
function useSequence(sequence) {
  currentSequence = sequence;
  
  // Save to localStorage
  saveSequences();
  
  // Close modal
  closeSequenceModal();
  
  // Show custom sequence selector
  showCustomSequenceSelector();
  
  // Start with the first step
  if (sequence.steps.length > 0 && typeof switchToSequenceStep === 'function') {
    switchToSequenceStep(0);
  }
}

// Delete sequence
function deleteSequence(sequenceId) {
  // Confirm deletion
  if (!confirm('Are you sure you want to delete this sequence?')) {
    return;
  }
  
  // Remove from sequences
  sequences = sequences.filter(seq => seq.id !== sequenceId);
  
  // If it's the current sequence, clear it
  if (currentSequence && currentSequence.id === sequenceId) {
    currentSequence = null;
    hideCustomSequenceSelector();
  }
  
  // Save to localStorage
  saveSequences();
  
  // Render saved sequences
  renderSavedSequences();
}

// Show custom sequence selector
function showCustomSequenceSelector() {
  if (!customSequenceSelector || !currentSequence) return;
  
  customSequenceSelector.classList.remove('hidden');
  
  // Render sequence steps
  renderSequenceStepsPreview();
}

// Hide custom sequence selector
function hideCustomSequenceSelector() {
  if (!customSequenceSelector) return;
  
  customSequenceSelector.classList.add('hidden');
}

// Render sequence steps preview
function renderSequenceStepsPreview() {
  if (!sequenceStepsContainer || !currentSequence) return;
  
  // Clear container
  sequenceStepsContainer.innerHTML = '';
  
  // Add steps
  currentSequence.steps.forEach((step, index) => {
    const stepItem = document.createElement('div');
    stepItem.className = 'flex-shrink-0 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer transition-all duration-300';
    stepItem.dataset.index = index;
    
    // Set color based on type
    switch (step.type) {
      case 'focus':
        stepItem.classList.add('bg-indigo-600');
        break;
      case 'shortBreak':
        stepItem.classList.add('bg-green-600');
        break;
      case 'longBreak':
        stepItem.classList.add('bg-blue-600');
        break;
    }
    
    // Add active state if it's the current step
    if (index === getCurrentSequenceStepIndex()) {
      stepItem.classList.add('ring-2', 'ring-white', 'scale-110');
    }
    
    // Add step number
    stepItem.textContent = index + 1;
    
    // Add click event
    stepItem.addEventListener('click', () => {
      if (typeof switchToSequenceStep === 'function') {
        switchToSequenceStep(index);
      }
    });
    
    sequenceStepsContainer.appendChild(stepItem);
  });
}

// Get current sequence step index
function getCurrentSequenceStepIndex() {
  // This will be implemented in timer.js
  return 0;
}

// Switch to sequence step
function switchToSequenceStep(index) {
  // This will be implemented in timer.js
}

// Initialize custom sequences when DOM is loaded
document.addEventListener('DOMContentLoaded', initCustomSequences);