/**
 * Tasks functionality for the Pomodoro app
 * Handles task management and integration with timer sessions
 */

const taskInputElement = document.getElementById('task-input');
const addTaskFormElement = document.getElementById('add-task-form');
const taskListElement = document.getElementById('task-list');
const completedTasksDisplay = document.getElementById('completed-tasks');
const totalTasksDisplay = document.getElementById('total-tasks');
const clearCompletedBtnElement = document.getElementById('clear-completed-btn');

let tasksState = [];
let currentSelectedTaskId = null;

function initTasksModule() {
  loadTasksFromStorage();
  setupTaskEventListeners();
  renderTaskList();
  updateTaskStatsDisplay();
}

function loadTasksFromStorage() {
  tasksState = loadData('tasks', []);
}

function saveTasksToStorage() {
  saveData('tasks', tasksState);
}

function handleAddTask(event) {
  event.preventDefault();
  if (!taskInputElement || !taskInputElement.value.trim()) return;

  const newTask = {
    id: Date.now().toString(),
    text: taskInputElement.value.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
    pomodoros: 0
  };

  tasksState.unshift(newTask);
  saveTasksToStorage();
  taskInputElement.value = '';
  renderTaskList();
  updateTaskStatsDisplay();

  if (window.gsap && taskListElement && taskListElement.firstChild && !prefersReducedMotion()) {
    gsap.from(taskListElement.firstChild, { y: -25, opacity: 0, duration: 0.4, ease: "back.out(1.5)" });
  }
}

function renderTaskList() {
  if (!taskListElement) return;
  taskListElement.innerHTML = '';

  if (tasksState.length === 0) {
    taskListElement.innerHTML = `<div class="text-center text-[rgb(var(--muted-foreground-rgb))] py-5 px-3 text-sm">No tasks yet. Add one to get started!</div>`;
    return;
  }

  tasksState.forEach(task => {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item flex items-center justify-between p-3 rounded-lg mb-2.5 transition-all duration-200 ease-in-out cursor-pointer shadow-sm hover:shadow-md`;
    taskItem.dataset.id = task.id;
    taskItem.setAttribute('role', 'listitem');
    taskItem.setAttribute('tabindex', '0');

    if (task.completed) {
      taskItem.classList.add('completed');
    }
    if (task.id === currentSelectedTaskId && !task.completed) {
      taskItem.classList.add('bg-[rgba(var(--primary-rgb),0.15)]', 'ring-2', 'ring-[rgb(var(--primary-rgb))]');
    } else if (!task.completed) {
      taskItem.classList.add('bg-[rgba(var(--card-background-rgb),0.7)]');
    }

    const pomodorosDisplay = task.pomodoros > 0 ?
      `<span class="text-xs font-medium text-amber-400 mr-2 flex items-center" title="${task.pomodoros} Pomodoros">${'🍅'.repeat(Math.min(task.pomodoros, 5))}${task.pomodoros > 5 ? `+${task.pomodoros - 5}` : ''}</span>` : '';

    taskItem.innerHTML = `
      <div class="flex items-center flex-grow min-w-0">
        <input type="checkbox" id="task-check-${task.id}" class="task-checkbox form-checkbox h-5 w-5 rounded border-gray-500 text-[rgb(var(--primary-rgb))] focus:ring-[rgb(var(--primary-rgb))] mr-3 flex-shrink-0" ${task.completed ? 'checked' : ''} aria-labelledby="task-text-${task.id}">
        <label for="task-check-${task.id}" id="task-text-${task.id}" class="task-text flex-grow truncate ${task.completed ? 'line-through text-[rgb(var(--muted-foreground-rgb))]' : 'text-[rgb(var(--foreground-rgb))]'}">${task.text}</label>
      </div>
      <div class="flex items-center flex-shrink-0 ml-2">
        ${pomodorosDisplay}
        <button class="task-delete text-gray-500 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-[rgba(var(--destructive-rgb),0.1)]" aria-label="Delete task: ${task.text}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    `;

    const checkbox = taskItem.querySelector('.task-checkbox');
    checkbox.addEventListener('change', (e) => { e.stopPropagation(); toggleTaskCompletion(task.id); });

    const deleteBtn = taskItem.querySelector('.task-delete');
    deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteTask(task.id); });

    taskItem.addEventListener('click', (e) => {
      if (e.target.type === 'checkbox' || e.target.closest('.task-delete')) return;
      if (!task.completed) selectTaskForSession(task.id);
    });
    
    taskItem.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (document.activeElement === taskItem && !task.completed) {
          e.preventDefault();
          selectTaskForSession(task.id);
        }
      }
    });
    
    taskListElement.appendChild(taskItem);
  });
}

function toggleTaskCompletion(taskId) {
  const taskIndex = tasksState.findIndex(task => task.id === taskId);
  if (taskIndex === -1) return;

  tasksState[taskIndex].completed = !tasksState[taskIndex].completed;
  tasksState[taskIndex].completedAt = tasksState[taskIndex].completed ? new Date().toISOString() : null;

  if (tasksState[taskIndex].completed && currentSelectedTaskId === taskId) {
    currentSelectedTaskId = null;
  }

  saveTasksToStorage();
  renderTaskList();
  updateTaskStatsDisplay();
}

function deleteTask(taskId) {
  const taskIndex = tasksState.findIndex(task => task.id === taskId);
  if (taskIndex === -1) return;

  const taskItem = taskListElement.querySelector(`[data-id="${taskId}"]`);
  if (window.gsap && taskItem && !prefersReducedMotion()) {
    gsap.to(taskItem, {
      height: 0, paddingBlock: 0, marginBlock: 0, opacity: 0, duration: 0.3, ease: "power2.in",
      onComplete: () => {
        tasksState.splice(taskIndex, 1);
        if (currentSelectedTaskId === taskId) currentSelectedTaskId = null;
        saveTasksToStorage();
        renderTaskList();
        updateTaskStatsDisplay();
      }
    });
  } else {
    tasksState.splice(taskIndex, 1);
    if (currentSelectedTaskId === taskId) currentSelectedTaskId = null;
    saveTasksToStorage();
    renderTaskList();
    updateTaskStatsDisplay();
  }
}

function clearCompletedTasks() {
  const completedTaskItems = Array.from(taskListElement.querySelectorAll('.task-item.completed'));
  if (completedTaskItems.length === 0) return;

  if (window.gsap && !prefersReducedMotion()) {
    gsap.to(completedTaskItems, {
      height: 0, paddingBlock: 0, marginBlock: 0, opacity: 0, duration: 0.3, stagger: 0.05, ease: "power2.in",
      onComplete: () => {
        tasksState = tasksState.filter(task => !task.completed);
        saveTasksToStorage();
        renderTaskList();
        updateTaskStatsDisplay();
      }
    });
  } else {
    tasksState = tasksState.filter(task => !task.completed);
    saveTasksToStorage();
    renderTaskList();
    updateTaskStatsDisplay();
  }
}

function updateTaskStatsDisplay() {
  if (!completedTasksDisplay || !totalTasksDisplay) return;
  const completedCount = tasksState.filter(task => task.completed).length;
  completedTasksDisplay.textContent = completedCount;
  totalTasksDisplay.textContent = tasksState.length;
}

function selectTaskForSession(taskId) {
  if (currentSelectedTaskId === taskId) {
    currentSelectedTaskId = null;
  } else {
    const taskToSelect = tasksState.find(t => t.id === taskId);
    if (taskToSelect && !taskToSelect.completed) {
      currentSelectedTaskId = taskId;
    } else {
      currentSelectedTaskId = null;
    }
  }
  renderTaskList();
}

function getCurrentTask() {
  if (!currentSelectedTaskId) return null;
  return tasksState.find(task => task.id === currentSelectedTaskId);
}
window.getCurrentTask = getCurrentTask;

function incrementTaskPomodoro() {
  const currentTask = getCurrentTask();
  if (!currentTask) return;

  const taskIndex = tasksState.findIndex(task => task.id === currentTask.id);
  if (taskIndex === -1) return;

  tasksState[taskIndex].pomodoros = (tasksState[taskIndex].pomodoros || 0) + 1;
  saveTasksToStorage();
  renderTaskList();
}
window.incrementTaskPomodoro = incrementTaskPomodoro;

function getTaskStats() {
  const totalTasks = tasksState.length;
  const completedTasks = tasksState.filter(task => task.completed).length;
  const totalPomodoros = tasksState.reduce((sum, task) => sum + (task.pomodoros || 0), 0);
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) : 0;

  return { totalTasks, completedTasks, totalPomodoros, completionRate };
}
window.getTaskStats = getTaskStats;

function setupTaskEventListeners() {
  if (addTaskFormElement) addTaskFormElement.addEventListener('submit', handleAddTask);
  if (clearCompletedBtnElement) clearCompletedBtnElement.addEventListener('click', clearCompletedTasks);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('task-input')) {
    initTasksModule();
  }
});