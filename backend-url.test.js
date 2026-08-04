const { getBackendUrl } = require('./backend-url');

function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (err) {
    console.error('✗', name, err.message);
    process.exitCode = 1;
  }
}

test('uses localhost for local hostnames', () => {
  if (getBackendUrl('localhost') !== 'http://localhost:3000') {
    throw new Error('Expected localhost fallback');
  }
});

test('uses production fallback for public hostnames', () => {
  const url = getBackendUrl('nikhilkharwal.github.io');
  if (url !== 'https://linkedin-hunter-backend.onrender.com') {
    throw new Error('Expected production fallback');
  }
});

test('respects backend override from query string', () => {
  const url = getBackendUrl('example.com', '?backend=https://example.com/api');
  if (url !== 'https://example.com/api') {
    throw new Error('Expected query override');
  }
});
