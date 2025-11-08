const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

async function parseJsonResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error('Server responded with an unexpected content type')
  }
  return response.json()
}

export async function fetchDailyLeaderboard() {
  const response = await fetch(`${API_BASE_URL}/leaderboard`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Failed to load leaderboard: ${response.status}`)
  }

  return parseJsonResponse(response)
}

export async function submitLeaderboardEntry(entry) {
  const response = await fetch(`${API_BASE_URL}/leaderboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(entry),
  })

  if (!response.ok) {
    throw new Error(`Failed to submit leaderboard entry: ${response.status}`)
  }

  return parseJsonResponse(response)
}
