import * as Sentry from "@sentry/nextjs";
import { scrubPiiFromEvent } from "@/lib/observability/sentry-scrub";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    sendDefaultPii: false,
    beforeSend: scrubPiiFromEvent,
  });
}
