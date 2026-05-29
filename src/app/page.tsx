export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Stream API</h1>
      <p>A REST API service for streaming content from multiple providers.</p>
      <h2>Endpoints</h2>
      <ul>
        <li><code>GET /api/providers</code> - List all providers</li>
        <li><code>GET /api/:provider/mainpage?page=1</code> - Get main page content</li>
        <li><code>GET /api/:provider/search?q=query&page=1</code> - Search for content</li>
        <li><code>GET /api/:provider/info?url=encoded_url</code> - Get detailed info</li>
        <li><code>GET /api/:provider/streams?data=encoded_json</code> - Get stream links</li>
      </ul>
      <h2>Available Providers</h2>
      <ul id="providers-list">Loading...</ul>
      <script dangerouslySetInnerHTML={{
        __html: `
          fetch('/api/providers')
            .then(r => r.json())
            .then(d => {
              document.getElementById('providers-list').innerHTML =
                d.data.map(p => '<li><strong>' + p.id + '</strong> - ' + p.name + ' (' + p.lang + ')</li>').join('')
            })
            .catch(() => { document.getElementById('providers-list').innerHTML = 'Failed to load' })
        `
      }} />
    </div>
  )
}
