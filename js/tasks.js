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
  // Load tasks from localStorage
  loadTasks();
  
  // Set up event listeners
  if (addTaskForm) {
    addTaskForm.addEventListener('submit', handleAddTask);
  }
  
  if (clearCompletedBtn) {
    clearCompletedBtn.addEventListener('click', clearCompletedTasks);
  }
  
  // Render tasks
  renderTasks();
  updateTaskStats();
}

// Load tasks from localStorage
function loadTasks() {
  try {
    const storedTasks = localStorage.getItem(`${APP_NAME}_tasks`);
    tasks = storedTasks ? JSON.parse(storedTasks) : [];
  } catch (error) {
    console.error('Error loading tasks:', error);
    tasks = [];
  }
}

// Save tasks to localStorage
function saveTasks() {
  try {
    localStorage.setItem(`${APP_NAME}_tasks`, JSON.stringify(tasks));
  } catch (error) {
    console.error('Error saving tasks:', error);
  }
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
  
  // Add task to state
  tasks.unshift(newTask);
  
  // Save to localStorage
  saveTasks();
  
  // Clear input
  taskInput.value = '';
  
  // Render tasks
  renderTasks();
  updateTaskStats();
  
  // Animate the new task
  if (window.gsap && taskList && taskList.firstChild) {
    gsap.from(taskList.firstChild, {
      y: -20,
      opacity: 0,
      duration: 0.5,
      ease: "back.out(1.7)"
    });
  }
}

// Render tasks
function renderTasks() {
  if (!taskList) return;
  
  // Clear task list
  taskList.innerHTML = '';
  
  if (tasks.length === 0) {
    taskList.innerHTML = `
      <div class="text-gray-400 text-center py-4">
        No tasks yet. Add a task to get started.
      </div>
    `;
    return;
  }
  
  // Add tasks to list
  tasks.forEach(task => {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item flex items-center justify-between p-3 bg-black bg-opacity-30 rounded-lg ${task.completed ? 'completed' : ''}`;
    taskItem.dataset.id = task.id;
    
    taskItem.innerHTML = `
      <div class="flex items-center">
        <input type="checkbox" class="task-checkbox mr-3 h-5 w-5 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500" ${task.completed ? 'checked' : ''}>
        <span class="task-text">${task.text}</span>
      </div>
      <div class="flex items-center">
        ${task.pomodoros > 0 ? `<span class="text-xs text-gray-400 mr-3">${task.pomodoros} 🍅</span>` : ''}
        <button class="task-delete text-gray-400 hover:text-red-500 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    `;
    
    // Add event listeners
    const checkbox = taskItem.querySelector('.task-checkbox');
    if (checkbox) {
      checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));
    }
    
    const deleteBtn = taskItem.querySelector('.task-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => deleteTask(task.id));
    }
    
    // Make task selectable for current focus session
    taskItem.addEventListener('click', (e) => {
      // Ignore clicks on checkbox and delete button
      if (e.target.closest('.task-checkbox') || e.target.closest('.task-delete')) {
        return;
      }
      
      selectTaskForSession(task.id);
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
  
  // Save to localStorage
  saveTasks();
  
  // Update UI
  const taskItem = taskList.querySelector(`[data-id="${taskId}"]`);
  if (taskItem) {
    if (tasks[taskIndex].completed) {
      taskItem.classList.add('completed');
    } else {
      taskItem.classList.remove('completed');
    }
  }
  
  updateTaskStats();
}

// Delete task
function deleteTask(taskId) {
  // Find task index
  const taskIndex = tasks.findIndex(task => task.id === taskId);
  if (taskIndex === -1) return;
  
  // Get task element
  const taskItem = taskList.querySelector(`[data-id="${taskId}"]`);
  
  // Animate removal
  if (window.gsap && taskItem) {
    gsap.to(taskItem, {
      x: 100,
      opacity: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        // Remove from state
        tasks.splice(taskIndex, 1);
        
        // Save to localStorage
        saveTasks();
        
        // Re-render tasks
        renderTasks();
        updateTaskStats();
      }
    });
  } else {
    // Remove from state without animation
    tasks.splice(taskIndex, 1);
    
    // Save to localStorage
    saveTasks();
    
    // Re-render tasks
    renderTasks();
    updateTaskStats();
  }
}

// Clear completed tasks
function clearCompletedTasks() {
  // Filter out completed tasks
  const completedTaskItems = document.querySelectorAll('.task-item.completed');
  
  if (completedTaskItems.length === 0) return;
  
  // Animate removal
  if (window.gsap) {
    gsap.to(completedTaskItems, {
      x: 100,
      opacity: 0,
      duration: 0.3,
      stagger: 0.1,
      ease: "power2.in",
      onComplete: () => {
        // Remove completed tasks from state
        tasks = tasks.filter(task => !task.completed);
        
        // Save to localStorage
        saveTasks();
        
        // Re-render tasks
        renderTasks();
        updateTaskStats();
      }
    });
  } else {
    // Remove without animation
    tasks = tasks.filter(task => !task.completed);
    
    // Save to localStorage
    saveTasks();
    
    // Re-render tasks
    renderTasks();
    updateTaskStats();
  }
}

// Update task stats
function updateTaskStats() {
  if (!completedTasksElement || !totalTasksElement) return;
  
  const completedCount = tasks.filter(task => task.completed).length;
  const totalCount = tasks.length;
  
  completedTasksElement.textContent = completedCount;
  totalTasksElement.textContent = totalCount;
}

// Select task for current session
function selectTaskForSession(taskId) {
  // Deselect all tasks
  const allTaskItems = document.querySelectorAll('.task-item');
  allTaskItems.forEach(item => {
    item.classList.remove('bg-indigo-900', 'bg-opacity-30');
  });
  
  // If selecting the same task, deselect it
  if (currentTaskId === taskId) {
    currentTaskId = null;
    return;
  }
  
  // Select the new task
  currentTaskId = taskId;
  const selectedTaskItem = document.querySelector(`.task-item[data-id="${taskId}"]`);
  if (selectedTaskItem) {
    selectedTaskItem.classList.add('bg-indigo-900', 'bg-opacity-30');
    
    // Animate selection
    if (window.gsap) {
      gsap.fromTo(selectedTaskItem, 
        { scale: 1 },
        { 
          scale: 1.03, 
          duration: 0.2,
          yoyo: true,
          repeat: 1,
          ease: "power2.inOut"
        }
      );
    }
  }
}

// Get current task
function getCurrentTask() {
  if (!currentTaskId) return null;
  return tasks.find(task => task.id === currentTaskId);
}

// Increment pomodoro count for current task
function incrementTaskPomodoro() {
  if (!currentTaskId) return;
  
  const taskIndex = tasks.findIndex(task => task.id === currentTaskId);
  if (taskIndex === -1) return;
  
  tasks[taskIndex].pomodoros++;
  
  // Save to localStorage
  saveTasks();
  
  // Update UI
  renderTasks();
}

// Get task stats for dashboard
function getTaskStats() {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.completed).length;
  const totalPomodoros = tasks.reduce((sum, task) => sum + task.pomodoros, 0);
  
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  return {
    totalTasks,
    completedTasks,
    totalPomodoros,
    completionRate
  };
}

// Initialize tasks when DOM is loaded
document.addEventListener('DOMContentLoaded', initTasks);