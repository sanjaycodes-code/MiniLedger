import { config } from './config';
import { createApp } from './app';
import { prisma } from './db';

const app = createApp();

if (config.DEMO_MODE) {
  console.warn(
    `[DEMO] DEMO_MODE=true enabled: ${config.DEMO_PHONE} accepts fixed OTP ${config.DEMO_OTP}`,
  );
}

const server = app.listen(config.PORT, '0.0.0.0', () => {
  console.log(
    `MiniLedger backend listening on 0.0.0.0:${config.PORT} (${config.NODE_ENV})`,
  );
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`Received ${signal}, shutting down gracefully...`);

  server.close(async () => {
    try {
      await prisma.$disconnect();
    } finally {
      process.exit(0);
    }
  });

  setTimeout(() => {
    void prisma.$disconnect().finally(() => {
      process.exit(0);
    });
  }, 5000).unref();
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
