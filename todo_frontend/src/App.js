import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

/**
 * @typedef {Object} Todo
 * @property {string} id Stable unique id.
 * @property {string} title User-entered task title.
 * @property {boolean} completed Completion flag.
 * @property {number} createdAt Epoch milliseconds for stable sorting.
 */

const STORAGE_KEY = "retro_todos_v1";

/** @returns {string} */
function generateId() {
  // Good-enough unique id without extra dependencies.
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** @param {unknown} value @returns {Todo[]} */
function parseStoredTodos(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (t) =>
          t &&
          typeof t === "object" &&
          typeof t.id === "string" &&
          typeof t.title === "string" &&
          typeof t.completed === "boolean"
      )
      .map((t) => ({
        id: t.id,
        title: t.title,
        completed: Boolean(t.completed),
        createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
      }));
  } catch {
    return [];
  }
}

/**
 * @param {Todo[]} todos
 * @returns {{ total: number; completed: number; active: number }}
 */
function getCounts(todos) {
  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  return { total, completed, active: total - completed };
}

// PUBLIC_INTERFACE
function App() {
  /** @type {[Todo[], Function]} */
  const [todos, setTodos] = useState(() =>
    parseStoredTodos(window.localStorage?.getItem(STORAGE_KEY))
  );
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | completed
  const [error, setError] = useState("");

  const newInputRef = useRef(null);
  const editInputRef = useRef(null);

  // Persist to localStorage
  useEffect(() => {
    try {
      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch {
      // If storage is blocked, app still works in-memory.
    }
  }, [todos]);

  // Focus management for better UX/accessibility
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select?.();
    }
  }, [editingId]);

  const visibleTodos = useMemo(() => {
    const sorted = [...todos].sort((a, b) => a.createdAt - b.createdAt);
    if (filter === "active") return sorted.filter((t) => !t.completed);
    if (filter === "completed") return sorted.filter((t) => t.completed);
    return sorted;
  }, [todos, filter]);

  const counts = useMemo(() => getCounts(todos), [todos]);

  /** @param {string} title @returns {string|null} */
  const validateTitle = (title) => {
    const trimmed = title.trim();
    if (!trimmed) return "Please type a task name.";
    if (trimmed.length > 120) return "Task name is too long (max 120 chars).";
    return null;
  };

  const clearErrorSoon = () => {
    window.setTimeout(() => setError(""), 2500);
  };

  // PUBLIC_INTERFACE
  const addTodo = () => {
    const validationError = validateTitle(newTitle);
    if (validationError) {
      setError(validationError);
      clearErrorSoon();
      return;
    }

    const title = newTitle.trim();
    const next = {
      id: generateId(),
      title,
      completed: false,
      createdAt: Date.now(),
    };

    setTodos((prev) => [...prev, next]);
    setNewTitle("");
    setError("");

    // Restore focus to the main input to allow quick entry loops.
    newInputRef.current?.focus?.();
  };

  // PUBLIC_INTERFACE
  const startEdit = (todo) => {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
    setError("");
  };

  // PUBLIC_INTERFACE
  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
    setError("");
  };

  // PUBLIC_INTERFACE
  const commitEdit = () => {
    const validationError = validateTitle(editingTitle);
    if (validationError) {
      setError(validationError);
      clearErrorSoon();
      return;
    }

    const nextTitle = editingTitle.trim();
    setTodos((prev) =>
      prev.map((t) => (t.id === editingId ? { ...t, title: nextTitle } : t))
    );
    setEditingId(null);
    setEditingTitle("");
    setError("");
  };

  // PUBLIC_INTERFACE
  const deleteTodo = (id) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) cancelEdit();
  };

  // PUBLIC_INTERFACE
  const toggleCompleted = (id) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  // PUBLIC_INTERFACE
  const clearCompleted = () => {
    setTodos((prev) => prev.filter((t) => !t.completed));
    if (editingId) {
      const stillExists = todos.some((t) => t.id === editingId && !t.completed);
      if (!stillExists) cancelEdit();
    }
  };

  const onNewSubmit = (e) => {
    e.preventDefault();
    addTodo();
  };

  const onEditSubmit = (e) => {
    e.preventDefault();
    commitEdit();
  };

  return (
    <div className="App">
      <div className="crt" aria-hidden="true" />
      <header className="retro-header">
        <div className="brand">
          <div className="brand__title">
            Retro Todo Terminal<span className="blink">_</span>
          </div>
          <div className="brand__subtitle">A tiny CRUD list with neon vibes</div>
        </div>

        <div className="stats" aria-label="Todo statistics">
          <div className="stat">
            <span className="stat__label">TOTAL</span>
            <span className="stat__value">{counts.total}</span>
          </div>
          <div className="stat">
            <span className="stat__label">ACTIVE</span>
            <span className="stat__value">{counts.active}</span>
          </div>
          <div className="stat">
            <span className="stat__label">DONE</span>
            <span className="stat__value">{counts.completed}</span>
          </div>
        </div>
      </header>

      <main className="retro-shell">
        <section className="panel" aria-label="Add new todo">
          <div className="panel__title">NEW TASK</div>
          <form className="new-form" onSubmit={onNewSubmit}>
            <label className="sr-only" htmlFor="newTodo">
              Add a new task
            </label>
            <input
              id="newTodo"
              ref={newInputRef}
              className="input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Type something... (e.g., 'Refactor the time machine')"
              maxLength={140}
              autoComplete="off"
            />
            <button className="btn btn--primary" type="submit">
              Add
            </button>
          </form>

          {error ? (
            <div className="alert" role="status" aria-live="polite">
              {error}
            </div>
          ) : null}
        </section>

        <section className="panel" aria-label="Todo list">
          <div className="panel__row">
            <div className="panel__title">TASKS</div>

            <div className="filters" role="tablist" aria-label="Filter tasks">
              <button
                type="button"
                className={`chip ${filter === "all" ? "chip--active" : ""}`}
                onClick={() => setFilter("all")}
                aria-pressed={filter === "all"}
              >
                All
              </button>
              <button
                type="button"
                className={`chip ${filter === "active" ? "chip--active" : ""}`}
                onClick={() => setFilter("active")}
                aria-pressed={filter === "active"}
              >
                Active
              </button>
              <button
                type="button"
                className={`chip ${
                  filter === "completed" ? "chip--active" : ""
                }`}
                onClick={() => setFilter("completed")}
                aria-pressed={filter === "completed"}
              >
                Completed
              </button>
            </div>
          </div>

          {todos.length === 0 ? (
            <div className="empty" role="status" aria-live="polite">
              No tasks yet. Add one above to begin.
            </div>
          ) : visibleTodos.length === 0 ? (
            <div className="empty" role="status" aria-live="polite">
              No tasks match this filter.
            </div>
          ) : (
            <ul className="todo-list" aria-label="Todos">
              {visibleTodos.map((todo) => {
                const isEditing = editingId === todo.id;
                return (
                  <li
                    key={todo.id}
                    className={`todo ${todo.completed ? "todo--done" : ""}`}
                  >
                    <button
                      type="button"
                      className={`check ${todo.completed ? "check--on" : ""}`}
                      onClick={() => toggleCompleted(todo.id)}
                      aria-label={
                        todo.completed
                          ? `Mark "${todo.title}" as not completed`
                          : `Mark "${todo.title}" as completed`
                      }
                      aria-pressed={todo.completed}
                    >
                      <span className="check__box" aria-hidden="true" />
                    </button>

                    <div className="todo__main">
                      {isEditing ? (
                        <form className="edit-form" onSubmit={onEditSubmit}>
                          <label className="sr-only" htmlFor={`edit-${todo.id}`}>
                            Edit task
                          </label>
                          <input
                            id={`edit-${todo.id}`}
                            ref={editInputRef}
                            className="input input--edit"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            maxLength={140}
                            autoComplete="off"
                          />
                          <div className="todo__actions">
                            <button
                              type="submit"
                              className="btn btn--ok"
                              aria-label="Save edit"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost"
                              onClick={cancelEdit}
                              aria-label="Cancel edit"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="todo__title">{todo.title}</div>
                          <div className="todo__meta">
                            {todo.completed ? "STATUS: DONE" : "STATUS: ACTIVE"}
                          </div>
                        </>
                      )}
                    </div>

                    {!isEditing ? (
                      <div className="todo__actions">
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => startEdit(todo)}
                          aria-label={`Edit "${todo.title}"`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger"
                          onClick={() => deleteTodo(todo.id)}
                          aria-label={`Delete "${todo.title}"`}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="footer-row">
            <div className="hint" aria-label="Keyboard hint">
              Tip: Press Enter to save when editing.
            </div>

            <button
              type="button"
              className="btn btn--ghost"
              onClick={clearCompleted}
              disabled={counts.completed === 0}
            >
              Clear completed
            </button>
          </div>
        </section>

        <section className="panel panel--tiny" aria-label="About">
          <div className="panel__title">ABOUT</div>
          <div className="about">
            <div>
              Data is stored in your browser (localStorage). No login required.
            </div>
            <div className="about__small">
              Env available (not required here): REACT_APP_API_BASE, etc.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
