Promise.all([
  fetch('/api/hello').then((r) => r.json()),
  fetch('/health').then((r) => r.json()),
])
  .then(([hello, health]) => {
    document.getElementById('live').textContent =
      'GET /api/hello -> ' + JSON.stringify(hello) + '\n' +
      'GET /health -> ' + JSON.stringify(health);
  })
  .catch((err) => {
    document.getElementById('live').textContent = 'API check failed: ' + err;
    console.error(err);
  });
