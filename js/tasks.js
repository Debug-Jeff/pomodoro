/**
 * Tasks functionality for the Pomodoro app
 * Handles task management and integration with timer sessions
 */

// DOM elements
const taskInput = document.getElementById('task-input');
const addTaskForm = document.getElementById('add-task-form');
const taskList = document.getElementById('task-list');
const completedTasksElement = document.getElementById('completed-tasks');
const totalTasksElement = document.getElementById('total-tasks');
const clearCompletedBtn = document.getElementById('clear-completed-btn');

// Task state
let tasks = [];
let currentTaskId = null;

// Initialize tasks
function initTasks() {
  loadTasksFromStorage(); // Renamed for clarity
  setupTaskEventListeners(); // Renamed
  renderTasks();
  updateTaskStats();
}

// Load tasks from localStorage
function loadTasksFromStorage() {
  tasks = loadData('tasks', []); // Use global loadData
}

// Save tasks to localStorage
function saveTasksToStorage() {
  saveData('tasks', tasks); // Use global saveData
  // Dispatch storage event for dashboard or other components
  window.dispatchEvent(new StorageEvent('storage', { key: `${APP_NAME}_tasks`, newValue: JSON.stringify(tasks) }));
}

// Handle add task form submission
function handleAddTask(event) {
  event.preventDefault();
  if (!taskInput || !taskInput.value.trim()) return;

  const newTask = {
    id: Date.now().toString(),
    text: taskInput.value.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
    pomodoros: 0
  };

  tasks.unshift(newTask);
  saveTasksToStorage();
  taskInput.value = '';
  renderTasks();
  updateTaskStats();

  if (window.gsap && taskList && taskList.firstChild && !prefersReducedMotion()) {
    gsap.from(taskList.firstChild, { y: -20, opacity: 0, duration: 0.4, ease: "back.out(1.4)" });
  }
}

// Render tasks
function renderTasks() {
  if (!taskList) return;
  taskList.innerHTML = '';

  if (tasks.length === 0) {
    taskList.innerHTML = `<div class="text-gray-400 text-center py-4">No tasks yet. Add one above!</div>`;
    return;
  }

  tasks.forEach(task => {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item flex items-center justify-between p-3 bg-opacity-30 rounded-lg mb-2 transition-all duration-200 ease-in-out ${task.completed ? 'completed' : ''} ${task.id === currentTaskId ? 'bg-indigo-900/30 ring-2 ring-indigo-500' : 'bg-black/30'}`;
    taskItem.dataset.id = task.id;
    taskItem.setAttribute('role', 'listitem');
    taskItem.setAttribute('tabindex', '0'); // Make selectable by keyboard

    const pomodoroCountDisplay = task.pomodoros > 0 ? `<span class="text-xs text-yellow-400 mr-3">${'🍅'.repeat(task.pomodoros)}</span>` : '';

    taskItem.innerHTML = `
      <div class="flex items-center flex-grow">
        <input type="checkbox" id="task-check-${task.id}" class="task-checkbox form-checkbox h-5 w-5 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 mr-3 flex-shrink-0" ${task.completed ? 'checked' : ''} aria-labelledby="task-text-${task.id}">
        <label for="task-check-${task.id}" id="task-text-${task.id}" class="task-text flex-grow ${task.completed ? 'line-through text-gray-500' : 'text-gray-100'} cursor-pointer">${task.text}</label>
      </div>
      <div class="flex items-center flex-shrink-0 ml-2">
        ${pomodoroCountDisplay}
        <button class="task-delete text-gray-500 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-500/10" aria-label="Delete task ${task.text}">
          <svg xmlns="<http://www.w3.org/2000/svg>" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    `;

    const checkbox = taskItem.querySelector('.task-checkbox');
    checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));

    const deleteBtn = taskItem.querySelector('.task-delete');
    deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteTask(task.id); });

    taskItem.addEventListener('click', (e) => {
      if (e.target.type === 'checkbox' || e.target.closest('.task-delete')) return;
      selectTaskForSession(task.id);
    });
    taskItem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (document.activeElement === taskItem) { // only if task item itself is focused
                 selectTaskForSession(task.id);
            }
        }
    });
    taskList.appendChild(taskItem);
  });
}

// Toggle task completion
function toggleTaskCompletion(taskId) {
  const taskIndex = tasks.findIndex(task => task.id === taskId);
  if (taskIndex === -1) return;

  tasks[taskIndex].completed = !tasks[taskIndex].completed;
  tasks[taskIndex].completedAt = tasks[taskIndex].completed ? new Date().toISOString() : null;
  saveTasksToStorage();
  renderTasks(); // Re-render to update styles correctly
  updateTaskStats();
}

// Delete task
function deleteTask(taskId) {
  const taskIndex = tasks.findIndex(task => task.id === taskId);
  if (taskIndex === -1) return;

  const taskItem = taskList.querySelector(`[data-id="${taskId}"]`);
  if (window.gsap && taskItem && !prefersReducedMotion()) {
    gsap.to(taskItem, {
      height: 0, padding: 0, margin: 0, opacity: 0, duration: 0.3, ease: "power2.in",
      onComplete: () => {
        tasks.splice(taskIndex, 1);
        if (currentTaskId === taskId) currentTaskId = null;
        saveTasksToStorage();
        renderTasks(); // Full re-render might be simpler than partial DOM manipulation
        updateTaskStats();
      }
    });
  } else {
    tasks.splice(taskIndex, 1);
    if (currentTaskId === taskId) currentTaskId = null;
    saveTasksToStorage();
    renderTasks();
    updateTaskStats();
  }
}

// Clear completed tasks
function clearCompletedTasks() {
  const completedTaskItems = Array.from(taskList.querySelectorAll('.task-item.completed'));
  if (completedTaskItems.length === 0) return;

  if (window.gsap && !prefersReducedMotion()) {
    gsap.to(completedTaskItems, {
      height: 0, padding: 0, margin: 0, opacity: 0, duration: 0.3, stagger: 0.05, ease: "power2.in",
      onComplete: () => {
        tasks = tasks.filter(task => !task.completed);
        if (tasks.find(task => task.id === currentTaskId && task.completed)) {
            currentTaskId = null; // Deselect if current task was cleared
        }
        saveTasksToStorage();
        renderTasks();
        updateTaskStats();
      }
    });
  } else {
    tasks = tasks.filter(task => !task.completed);
    if (tasks.find(task => task.id === currentTaskId && task.completed)) {
        currentTaskId = null;
    }
    saveTasksToStorage();
    renderTasks();
    updateTaskStats();
  }
}

// Update task stats display
function updateTaskStats() {
  if (!completedTasksElement || !totalTasksElement) return;
  const completedCount = tasks.filter(task => task.completed).length;
  completedTasksElement.textContent = completedCount;
  totalTasksElement.textContent = tasks.length;
}

// Select task for current session
function selectTaskForSession(taskId) {
  if (currentTaskId === taskId) { // Click again to deselect
    currentTaskId = null;
  } else {
    currentTaskId = taskId;
  }
  renderTasks(); // Re-render to update selection highlight
  // Optionally, provide feedback for screen readers if selection changes
}

// Get current selected task
function getCurrentTask() {
  if (!currentTaskId) return null;
  return tasks.find(task => task.id === currentTaskId);
}
window.getCurrentTask = getCurrentTask; // Expose for timer.js

// Increment pomodoro count for current task
function incrementTaskPomodoro() {
  if (!currentTaskId) return;
  const taskIndex = tasks.findIndex(task => task.id === currentTaskId);
  if (taskIndex === -1) return;

  tasks[taskIndex].pomodoros = (tasks[taskIndex].pomodoros || 0) + 1;
  saveTasksToStorage();
  renderTasks(); // Re-render to show updated pomodoro count
}
window.incrementTaskPomodoro = incrementTaskPomodoro; // Expose for timer.js

// Get task stats for dashboard
function getTaskStats() {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.completed).length;
  const totalPomodoros = tasks.reduce((sum, task) => sum + (task.pomodoros || 0), 0);
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) : 0; // Rate as 0-1

  return { totalTasks, completedTasks, totalPomodoros, completionRate };
}
window.getTaskStats = getTaskStats; // Expose for dashboard.js

// Setup event listeners for task module
function setupTaskEventListeners() {
  if (addTaskForm) addTaskForm.addEventListener('submit', handleAddTask);
  if (clearCompletedBtn) clearCompletedBtn.addEventListener('click', clearCompletedTasks);
}

// Initialize tasks when DOM is loaded
document.addEventListener('DOMContentLoaded', initTasks);
