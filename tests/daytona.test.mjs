import { test } from 'node:test';
import { execFileSync } from 'node:child_process';

test('Daytona helper lifecycle and artifact transfers (offline, no rendering)', () => {
  const python = process.platform === 'win32' ? 'python' : 'python3';
  execFileSync(python, ['-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_daytona_video.py'],
    { stdio: 'pipe' });
});
