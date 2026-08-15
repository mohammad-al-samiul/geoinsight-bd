export function remainingClock(deadlineIso: string, now = Date.now()) {
  const ms = new Date(deadlineIso).getTime() - now;
  const breached = ms < 0;
  const abs = Math.abs(ms);
  const hours = Math.floor(abs / 3_600_000);
  const mins = Math.floor((abs % 3_600_000) / 60_000);
  const secs = Math.floor((abs % 60_000) / 1_000);
  return { ms, breached, hours, mins, secs };
}

export function formatRemaining(
  deadlineIso: string,
  units: { hour: string; minute: string; overduePrefix: string },
  now = Date.now(),
) {
  const { breached, hours, mins } = remainingClock(deadlineIso, now);
  const span = `${hours}${units.hour} ${mins}${units.minute}`;
  return breached ? `${units.overduePrefix}${span}` : span;
}
