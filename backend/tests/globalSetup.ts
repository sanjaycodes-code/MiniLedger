import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

export default function setup(): void {
  const backendRoot = path.resolve(__dirname, '..');
  dotenv.config({
    path: path.join(backendRoot, '.env.test'),
    override: true,
  });

  execSync('npx prisma migrate deploy', {
    cwd: backendRoot,
    env: { ...process.env },
    stdio: 'inherit',
  });
}
