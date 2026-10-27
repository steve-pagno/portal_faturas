export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.INTERNAL_CRON === "true") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
