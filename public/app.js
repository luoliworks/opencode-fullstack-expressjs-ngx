fetch('/api/hello')
  .then((r) => r.json())
  .then((data) => console.log(data))
  .catch(console.error);
