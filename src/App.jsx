import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { generateDailyMaze, solveMazePath } from './utils/maze'
import { buildDailyMockLeaderboard, insertLeaderboardEntry } from './utils/leaderboard'
import FirstPersonView from './components/FirstPersonView'
import { movePlayerPosition, normalizeAngle } from './utils/movement'
import './App.css'

const MAZE_SIZE = 40
const CONTROL_KEYS = new Set(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'])
const MOVE_SPEED = 1 // cells per second
const TURN_SPEED = Math.PI*1.4 // radians per second (~180°)

function createInitialPlayerState() {
  return { x: 0.5, y: 0.5, angle: 0 }
}

function formatDuration(ms) {
  if (!ms || ms < 0) {
    return '00:00.0'
  }
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const tenths = Math.floor((ms % 1000) / 100)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`
}

function formatUtcTime(isoString) {
  if (!isoString) {
    return '—'
  }
  const date = new Date(isoString)
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  })
}

function Leaderboard({ title, entries, highlight }) {
  const sortedEntries = [...entries].sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))

  return (
    <div className="card">
      <h2>{title}</h2>
      <p className="card-subtitle">Clearing time is ranked by how early the finish time (UTC) was recorded.</p>
      <div className="leaderboard-wrapper">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Nickname</th>
              <th scope="col">Cleared at (UTC)</th>
              <th scope="col">Clear Time</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((entry, index) => {
              const isHighlight = Boolean(
                highlight &&
                  highlight.nickname === entry.nickname &&
                  highlight.completedAt === entry.completedAt,
              )
              return (
                <tr
                  key={`${entry.nickname}-${entry.completedAt}`}
                  className={isHighlight ? 'leaderboard-row highlight' : 'leaderboard-row'}
                >
                  <td>{index + 1}</td>
                  <td>{entry.nickname}</td>
                  <td>{formatUtcTime(entry.completedAt)}</td>
                  <td>{formatDuration(entry.durationMs)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MazeBoard({ maze, position, size, solutionCells, showSolution, className = '' }) {
  const wallColor = '#1f2937'
  const pathColor = '#e5e7eb'

  return (
    <div
      className={['maze-grid', className].filter(Boolean).join(' ')}
      style={{
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gridTemplateRows: `repeat(${size}, 1fr)`,
      }}
    >
      {maze.map((row) =>
        row.map((cell) => {
          const isStart = cell.row === 0 && cell.col === 0
          const isFinish = cell.row === size - 1 && cell.col === size - 1
          const isCurrent = cell.row === position.row && cell.col === position.col
          const cellKey = `${cell.row}-${cell.col}`
          const isSolutionCell = showSolution && solutionCells.has(cellKey)

          return (
            <div
              key={`${cell.row}-${cell.col}`}
              className={[
                'maze-cell',
                isStart ? 'start' : '',
                isFinish ? 'finish' : '',
                isCurrent ? 'current' : '',
                isSolutionCell ? 'solution' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                borderTop: `2px solid ${cell.walls.top ? wallColor : pathColor}`,
                borderRight: `2px solid ${cell.walls.right ? wallColor : pathColor}`,
                borderBottom: `2px solid ${cell.walls.bottom ? wallColor : pathColor}`,
                borderLeft: `2px solid ${cell.walls.left ? wallColor : pathColor}`,
              }}
            >
              {isStart ? <span className="cell-marker">S</span> : null}
              {isFinish ? <span className="cell-marker" role="img" aria-label="goal">🏁</span> : null}
            </div>
          )
        }),
      )}
    </div>
  )
}

function App() {
  const today = useMemo(() => new Date(), [])
  const todayLabel = today.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const dailyKey = useMemo(() => today.toISOString().slice(0, 10), [today])

  const [nickname, setNickname] = useState('')
  const [view, setView] = useState('landing')
  const [maze, setMaze] = useState(() => generateDailyMaze(MAZE_SIZE, dailyKey))
  const [position, setPosition] = useState({ row: 0, col: 0 })
  const [player, setPlayer] = useState(() => createInitialPlayerState())
  const [elapsedMs, setElapsedMs] = useState(0)
  const [leaderboard, setLeaderboard] = useState(() => buildDailyMockLeaderboard(dailyKey))
  const [playerResult, setPlayerResult] = useState(null)
  const [showSolution, setShowSolution] = useState(false)
  const startTimeRef = useRef(null)
  const pressedKeysRef = useRef(new Set())

  const solutionPath = useMemo(() => solveMazePath(maze), [maze])
  const solutionCells = useMemo(
    () => new Set(solutionPath.map((cell) => `${cell.row}-${cell.col}`)),
    [solutionPath],
  )

  useEffect(() => {
    setMaze(generateDailyMaze(MAZE_SIZE, dailyKey))
    setLeaderboard(buildDailyMockLeaderboard(dailyKey))
    setPosition({ row: 0, col: 0 })
    const initialPlayer = createInitialPlayerState()
    setPlayer(initialPlayer)
    setElapsedMs(0)
    setPlayerResult(null)
    setShowSolution(false)
    startTimeRef.current = null
    pressedKeysRef.current.clear()
    setView('landing')
  }, [dailyKey])

  useEffect(() => {
    if (view !== 'playing') {
      return undefined
    }
    const intervalId = window.setInterval(() => {
      if (startTimeRef.current) {
        setElapsedMs(Date.now() - startTimeRef.current)
      }
    }, 100)

    return () => window.clearInterval(intervalId)
  }, [view])

  const completeRun = useCallback(() => {
    if (view !== 'playing') {
      return
    }

    const finishedAt = new Date()
    const finishedAtIso = finishedAt.toISOString()
    const durationMs = startTimeRef.current ? finishedAt.getTime() - startTimeRef.current : 0
    startTimeRef.current = null
    setElapsedMs(durationMs)

    const newEntry = {
      nickname,
      completedAt: finishedAtIso,
      durationMs,
    }

    let computedRank = 0
    setLeaderboard((prev) => {
      const updated = insertLeaderboardEntry(prev, newEntry)
      computedRank =
        updated.findIndex(
          (entry) => entry.nickname === newEntry.nickname && entry.completedAt === newEntry.completedAt,
        ) + 1
      return updated
    })

    setPlayerResult({ ...newEntry, rank: computedRank })
    setView((prev) => (prev === 'playing' ? 'complete' : prev))
    pressedKeysRef.current.clear()
  }, [nickname, view])

  useEffect(() => {
    if (view !== 'playing') {
      pressedKeysRef.current.clear()
      return undefined
    }

    function handleKeyDown(event) {
      if (!CONTROL_KEYS.has(event.key)) {
        return
      }

      event.preventDefault()
      pressedKeysRef.current.add(event.key)
    }

    function handleKeyUp(event) {
      if (!CONTROL_KEYS.has(event.key)) {
        return
      }

      event.preventDefault()
      pressedKeysRef.current.delete(event.key)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      pressedKeysRef.current.clear()
    }
  }, [view])

  useEffect(() => {
    if (view !== 'playing') {
      return undefined
    }

    let animationFrameId = null
    let lastTimestamp = performance.now()

    const step = (timestamp) => {
      const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.12)
      lastTimestamp = timestamp

      setPlayer((prev) => {
        if (!maze.length) {
          return prev
        }

        const pressed = pressedKeysRef.current
        const forward = (pressed.has('ArrowUp') ? 1 : 0) - (pressed.has('ArrowDown') ? 1 : 0)
        const turn = (pressed.has('ArrowRight') ? 1 : 0) - (pressed.has('ArrowLeft') ? 1 : 0)

        if (forward === 0 && turn === 0) {
          return prev
        }

        const nextAngle = normalizeAngle(prev.angle + turn * TURN_SPEED * deltaSeconds)
        let nextPosition = prev

        if (forward !== 0) {
          const moveAmount = forward * MOVE_SPEED * deltaSeconds
          const deltaX = Math.cos(nextAngle) * moveAmount
          const deltaY = Math.sin(nextAngle) * moveAmount
          nextPosition = movePlayerPosition(prev, deltaX, deltaY, maze)
        }

        const prevRow = Math.floor(prev.y)
        const prevCol = Math.floor(prev.x)
        const newRow = Math.min(MAZE_SIZE - 1, Math.max(0, Math.floor(nextPosition.y)))
        const newCol = Math.min(MAZE_SIZE - 1, Math.max(0, Math.floor(nextPosition.x)))

        if (newRow !== prevRow || newCol !== prevCol) {
          setPosition({ row: newRow, col: newCol })
          if (newRow === MAZE_SIZE - 1 && newCol === MAZE_SIZE - 1) {
            completeRun()
          }
        }

        return { x: nextPosition.x, y: nextPosition.y, angle: nextAngle }
      })

      animationFrameId = window.requestAnimationFrame(step)
    }

    animationFrameId = window.requestAnimationFrame((timestamp) => {
      lastTimestamp = timestamp
      step(timestamp)
    })

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [completeRun, maze, view])

  const handleStartGame = (event) => {
    if (event) {
      event.preventDefault()
    }

    if (!nickname.trim()) {
      return
    }

    setMaze(generateDailyMaze(MAZE_SIZE, dailyKey))
    setPosition({ row: 0, col: 0 })
    const initialPlayer = createInitialPlayerState()
    setPlayer(initialPlayer)
    setElapsedMs(0)
    setView('playing')
    startTimeRef.current = Date.now()
    setShowSolution(false)
    pressedKeysRef.current.clear()
  }

  const handleReturnHome = () => {
    setPosition({ row: 0, col: 0 })
    const initialPlayer = createInitialPlayerState()
    setPlayer(initialPlayer)
    setElapsedMs(0)
    startTimeRef.current = null
    setView('landing')
    setShowSolution(false)
    pressedKeysRef.current.clear()
  }

  if (view === 'landing') {
    return (
      <div className="landing-page">
        <div className="landing-background" aria-hidden="true" />
        <div className="landing-main">
          <header className="landing-hero">
            <div className="landing-hero-body">
              <h1 className="landing-title">A-Mazing Today</h1>
              <p className="landing-subtitle">
                A daily 40×40 maze challenge. Everyone gets the same layout each day—race to the exit and see who escaped
                first!
              </p>
              <div className="landing-meta">
                <span className="pill">{todayLabel}</span>
                <span className="pill secondary">Seed: {dailyKey}</span>
              </div>
            </div>

            <form className="landing-start" onSubmit={handleStartGame}>
              <label className="visually-hidden" htmlFor="nickname">
                Nickname
              </label>
              <input
                id="nickname"
                type="text"
                placeholder="Enter your name"
                value={nickname}
                onChange={(event) => setNickname(event.target.value.slice(0, 20))}
              />
              <button type="submit" className="primary" disabled={!nickname.trim()}>
                Play today&apos;s maze
              </button>
            </form>
          </header>
        </div>

        <div className="landing-leaderboard">
          <Leaderboard title="Today&apos;s leaderboard" entries={leaderboard} highlight={playerResult} />
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {view === 'playing' && (
        <>
          <header className="hero">
            <h1>Navigate the maze</h1>
            <p>Use the arrow keys to move forward and backward and to turn left or right. Reach the goal to log your finish time.</p>
            <div className="status-grid">
              <div>
                <span className="status-label">Player</span>
                <span className="status-value">{nickname}</span>
              </div>
              <div>
                <span className="status-label">Elapsed</span>
                <span className="status-value">{formatDuration(elapsedMs)}</span>
              </div>
              <div>
                <span className="status-label">Daily seed</span>
                <span className="status-value">{dailyKey}</span>
              </div>
            </div>
            <button type="button" className="ghost" onClick={handleReturnHome}>
              Leave run
            </button>
          </header>

          <section className="card maze-panel">
            <div className="maze-actions">
              <button
                type="button"
                className={['ghost', 'toggle-solution', showSolution ? 'active' : ''].filter(Boolean).join(' ')}
                onClick={() => setShowSolution((prev) => !prev)}
              >
                {showSolution ? 'Hide solution path' : 'Show solution path'}
              </button>
            </div>
            <div className="gameplay-views">
              <div className="first-person-panel">
                <FirstPersonView maze={maze} player={player} />
              </div>
              <div className="mini-maze">
                <p className="mini-maze-title">Maze overview</p>
                <MazeBoard
                  maze={maze}
                  position={position}
                  size={MAZE_SIZE}
                  solutionCells={solutionCells}
                  showSolution={showSolution}
                  className="mini-maze-grid"
                />
              </div>
            </div>
            <div className="legend">
              <span className="legend-item start">Start</span>
              <span className="legend-item finish">Goal</span>
              <span className="legend-item current">You</span>
              {showSolution ? <span className="legend-item solution">Path preview</span> : null}
            </div>
            <p className="controls-hint">Keyboard: ↑/↓ move · ←/→ turn</p>
          </section>
        </>
      )}

      {view === 'complete' && playerResult && (
        <>
          <header className="hero">
            <h1>Maze complete!</h1>
            <p>Great job escaping today&apos;s challenge.</p>
            <div className="completion-callout">
              <p>
                <strong>{nickname}</strong> cleared the maze in <strong>{formatDuration(playerResult.durationMs)}</strong>.
              </p>
              <p>
                Finish recorded at <strong>{formatUtcTime(playerResult.completedAt)}</strong> UTC — provisional rank #{' '}
                {playerResult.rank}.
              </p>
            </div>
            <div className="complete-actions">
              <button type="button" className="primary" onClick={handleStartGame}>
                Run it again
              </button>
              <button type="button" className="ghost" onClick={handleReturnHome}>
                Back to lobby
              </button>
            </div>
          </header>

          <Leaderboard title="Updated leaderboard" entries={leaderboard} highlight={playerResult} />
        </>
      )}
    </div>
  )
}

export default App
