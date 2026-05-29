export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Stream API</h1>
      <p>Multi-provider streaming REST API. Use the endpoints below:</p>
      <ul>
        <li><code>GET /api/providers</code> - List all providers</li>
        <li><code>GET /api/home?provider=xxx</code> - Browse content</li>
        <li><code>GET /api/search?q=&provider=xxx</code> - Search</li>
        <li><code>GET /api/info?id=&provider=xxx</code> - Get details</li>
        <li><code>GET /api/episodes?id=&provider=xxx</code> - Get episodes</li>
        <li><code>GET /api/watch?id=&provider=xxx</code> - Get stream URL</li>
      </ul>
    </div>
  )
}
