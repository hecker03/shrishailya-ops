import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'
const DEFAULT_ACCESS_CODE = 'shrishailya-ops-2026'

function App() {
  const [accessCode, setAccessCode] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const [portfolioItems, setPortfolioItems] = useState([])
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [statuses, setStatuses] = useState([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    status: '',
    completed: false,
    published: false,
  })
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('portfolio')

  const publicSummary = useMemo(() => {
    const published = portfolioItems.filter((item) => item.published)
    const completed = tasks.filter((item) => item.completed)
    return { publishedCount: published.length, completedCount: completed.length }
  }, [portfolioItems, tasks])

  useEffect(() => {
    fetch(`${API_BASE}/portfolio`)
      .then((res) => res.json())
      .then((data) => setPortfolioItems(data.tasks || []))
      .catch(() => setPortfolioItems([]))
  }, [])

  const handleAccess = async () => {
    try {
      const response = await fetch(`${API_BASE}/access/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode || DEFAULT_ACCESS_CODE }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage(data.detail || 'Access denied')
        setAuthorized(false)
        return
      }
      setAuthorized(data.ok)
      setMessage('Private board unlocked')
      loadPrivateData(accessCode || DEFAULT_ACCESS_CODE)
    } catch {
      setMessage('Unable to reach the backend')
    }
  }

  const loadPrivateData = async (code) => {
    try {
      const [metadataRes, tasksRes] = await Promise.all([
        fetch(`${API_BASE}/metadata`, { headers: { code } }),
        fetch(`${API_BASE}/tasks`, { headers: { code } }),
      ])
      const metadata = await metadataRes.json()
      const taskData = await tasksRes.json()
      setCategories(metadata.categories || [])
      setStatuses(metadata.statuses || [])
      setTasks(taskData.tasks || [])
    } catch {
      setTasks([])
    }
  }

  const handleCreateTask = async (event) => {
    event.preventDefault()
    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          code: accessCode || DEFAULT_ACCESS_CODE,
        },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage(data.detail || 'Task could not be created')
        return
      }
      setTasks((current) => [data, ...current])
      setForm({ title: '', description: '', category: '', status: '', completed: false, published: false })
      setMessage('Task created successfully')
    } catch {
      setMessage('Unable to create task')
    }
  }

  const toggleTask = async (task) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          code: accessCode || DEFAULT_ACCESS_CODE,
        },
        body: JSON.stringify({ completed: !task.completed }),
      })
      const updated = await response.json()
      if (!response.ok) {
        setMessage(updated.detail || 'Unable to update task')
        return
      }
      setTasks((current) => current.map((item) => (item.id === task.id ? updated : item)))
      setMessage('Task updated')
    } catch {
      setMessage('Unable to update task')
    }
  }

  const togglePublish = async (task) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          code: accessCode || DEFAULT_ACCESS_CODE,
        },
        body: JSON.stringify({ published: !task.published }),
      })
      const updated = await response.json()
      if (!response.ok) {
        setMessage(updated.detail || 'Unable to update portfolio flag')
        return
      }
      setTasks((current) => current.map((item) => (item.id === task.id ? updated : item)))
      setMessage('Portfolio visibility updated')
      fetch(`${API_BASE}/portfolio`)
        .then((res) => res.json())
        .then((data) => setPortfolioItems(data.tasks || []))
    } catch {
      setMessage('Unable to update portfolio flag')
    }
  }

  const deleteTask = async (taskId) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { code: accessCode || DEFAULT_ACCESS_CODE },
      })
      if (!response.ok) {
        const data = await response.json()
        setMessage(data.detail || 'Unable to delete task')
        return
      }
      setTasks((current) => current.filter((task) => task.id !== taskId))
      setMessage('Task removed')
    } catch {
      setMessage('Unable to delete task')
    }
  }

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">PORTFOLIO • OPS • TRACKER</p>
          <h1>Shrishailya Keskar</h1>
          <p className="hero-copy">
            Security-focused builder crafting forensic, web, and defensive systems with a strong emphasis on learning by doing.
          </p>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{publicSummary.publishedCount}</strong>
            <span>Published</span>
          </div>
          <div>
            <strong>{publicSummary.completedCount}</strong>
            <span>Completed</span>
          </div>
        </div>
      </header>

      <nav className="tab-nav">
        <button className={activeTab === 'portfolio' ? 'active' : ''} onClick={() => setActiveTab('portfolio')}>
          Public Portfolio
        </button>
        <button className={activeTab === 'private' ? 'active' : ''} onClick={() => setActiveTab('private')}>
          Private Tracking
        </button>
      </nav>

      {message ? <div className="status-pill">{message}</div> : null}

      {activeTab === 'portfolio' ? (
        <section className="panel-grid">
          <article className="panel">
            <h2>Selected work</h2>
            <p className="panel-copy">This section stays public and highlights the work you choose to publish.</p>
            <div className="card-list">
              {portfolioItems.length === 0 ? (
                <div className="empty-card">No published items yet. Mark a completed task as published from the private board.</div>
              ) : (
                portfolioItems.map((item) => (
                  <div key={item.id} className="card">
                    <div className="card-head">
                      <h3>{item.title}</h3>
                      <span className="tag">{item.category || 'General'}</span>
                    </div>
                    <p>{item.description || 'A polished project note will appear here.'}</p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      ) : (
        <section className="panel-grid private-layout">
          <article className="panel">
            <h2>Private board access</h2>
            <p className="panel-copy">Use the access code to enter the private board. This area remains hidden from the public portfolio.</p>
            <div className="access-box">
              <input
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                placeholder="Enter access code"
              />
              <button onClick={handleAccess}>{authorized ? 'Unlocked' : 'Unlock'}</button>
            </div>
            {!authorized ? <p className="hint">Default code: {DEFAULT_ACCESS_CODE}</p> : null}
          </article>

          <article className="panel">
            <h2>Add a task</h2>
            <form onSubmit={handleCreateTask} className="task-form">
              <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Task title" />
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Short note" />
              <div className="row-inputs">
                <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Category" />
                <input value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} placeholder="Status" />
              </div>
              <label className="checkbox-row">
                <input type="checkbox" checked={form.completed} onChange={() => setForm({ ...form, completed: !form.completed })} />
                Completed
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={form.published} onChange={() => setForm({ ...form, published: !form.published })} />
                Publish to portfolio
              </label>
              <button type="submit">Save task</button>
            </form>
          </article>

          <article className="panel wide-panel">
            <h2>Task board</h2>
            <div className="task-list">
              {tasks.length === 0 ? (
                <div className="empty-card">No tasks yet. Add your first item to begin tracking work.</div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="task-card">
                    <div className="task-main">
                      <div className="card-head">
                        <h3>{task.title}</h3>
                        <span className="tag">{task.category || 'General'}</span>
                      </div>
                      <p>{task.description || 'No notes added yet.'}</p>
                      <div className="meta-row">
                        <span>{task.status || 'Open'}</span>
                        <span>{task.completed ? 'Completed' : 'Active'}</span>
                      </div>
                    </div>
                    <div className="task-actions">
                      <button onClick={() => toggleTask(task)}>{task.completed ? 'Mark active' : 'Mark complete'}</button>
                      <button onClick={() => togglePublish(task)}>{task.published ? 'Unpublish' : 'Publish'}</button>
                      <button className="danger" onClick={() => deleteTask(task.id)}>Remove</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      )}
    </div>
  )
}

export default App
