process.env.NODE_ENV = 'production';
const { startServer } = await import('../server.ts');
await startServer();
