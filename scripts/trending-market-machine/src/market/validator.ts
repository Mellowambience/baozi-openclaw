// Validate market questions against Baozi rules before creation
import { CONFIG, type MarketQuestion, type ValidationResult } from "../config.ts";

const HOURS = 60 * 60 * 1000;
const DAYS = 24 * HOURS;

// Local pre-validation (catch issues before hitting the API)
export function localValidate(market: MarketQuestion): ValidationResult {
  const violations: ValidationResult["violations"] = [];
  const now = Date.now();

  // Check minimum time until close (48h)
  const hoursUntilClose = (market.closingTime.getTime() - now) / HOURS;
  if (hoursUntilClose < CONFIG.MIN_HOURS_UNTIL_CLOSE) {
    violations.push({
      severity: "critical",
      rule: "MIN_CLOSE_TIME",
      message: `Closing time must be at least ${CONFIG.MIN_HOURS_UNTIL_CLOSE}h from now. Got ${hoursUntilClose.toFixed(1)}h.`,
    });
  }

  // Check maximum time until close (14 days)
  const daysUntilClose = (market.closingTime.getTime() - now) / DAYS;
  if (daysUntilClose > CONFIG.MAX_DAYS_UNTIL_CLOSE) {
    violations.push({
      severity: "warning",
      rule: "MAX_CLOSE_TIME",
      message: `Markets closing >14 days out have poor UX. Got ${daysUntilClose.toFixed(1)} days.`,
    });
  }

  // Resolution time must be after closing time
  if (market.resolutionTime.getTime() <= market.closingTime.getTime()) {
    violations.push({
      severity: "critical",
      rule: "RESOLUTION_AFTER_CLOSE",
      message: "Resolution time must be after closing time.",
    });
  }

  // Type A: closing must be 24h before event
  if (market.timingType === "A") {
    // We can't know the exact event time, but we flag if close is too close to resolution
    const gapHours = (market.resolutionTime.getTime() - market.closingTime.getTime()) / HOURS;
    if (gapHours < 24) {
      violations.push({
        severity: "warning",
        rule: "TYPE_A_24H_GAP",
        message: `Type A markets should close 24h+ before the event. Gap: ${gapHours.toFixed(1)}h.`,
      });
    }
  }

  // Type B: closing must be before measurement period starts
  // (This is enforced by our generator, but double-check)

  // Question quality checks
  if (market.question.length < 20) {
    violations.push({
      severity: "critical",
      rule: "QUESTION_TOO_SHORT",
      message: "Question must be at least 20 characters.",
    });
  }

  if (market.question.length > 200) {
    violations.push({
      severity: "warning",
      rule: "QUESTION_TOO_LONG",
      message: "Question should be under 200 characters for readability.",
    });
  }

  // No subjective outcomes
  const subjective = market.question.toLowerCase().match(/\b(best|worst|exciting|interesting|good|bad|amazing|terrible)\b/);
  if (subjective) {
    violations.push({
      severity: "critical",
      rule: "SUBJECTIVE_OUTCOME",
      message: `Question contains subjective term "${subjective[1]}". Outcomes must be objectively verifiable.`,
    });
  }

  // Must have data source
  if (!market.dataSource || market.dataSource.length < 5) {
    violations.push({
      severity: "critical",
      rule: "MISSING_DATA_SOURCE",
      message: "Must specify a verifiable data source for resolution.",
    });
  }

  // Must end with question mark
  if (!market.question.trim().endsWith("?")) {
    violations.push({
      severity: "warning",
      rule: "MISSING_QUESTION_MARK",
      message: "Market question should end with a question mark.",
    });
  }

  return {
    approved: violations.filter((v) => v.severity === "critical").length === 0,
    violations,
  };
}

// Remote validation via Baozi API
export async function remoteValidate(market: MarketQuestion): Promise<ValidationResult> {
  try {
    // Build payload matching Baozi's expected format
    const payload: Record<string, unknown> = {
      question: market.question,
      closingTime: market.closingTime.toISOString(),
      marketType: market.timingType === "A" ? "typeA" : "typeB",
      description: market.description,
      dataSource: market.dataSource,
      backupSource: market.backupSource || `${market.dataSource} (cross-referenced)`,
      category: market.category,
    };

    // Type A needs eventTime
    if (market.timingType === "A" && market.eventTime) {
      payload.eventTime = market.eventTime.toISOString();
    }

    // Type B needs measurement period
    if (market.timingType === "B" && market.measurementStart) {
      payload.measurementStart = market.measurementStart.toISOString();
      payload.measurementEnd = market.measurementEnd?.toISOString();
    }

    const resp = await fetch(CONFIG.BAOZI_VALIDATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      return {
        approved: false,
        violations: [{ severity: "critical", rule: "API_ERROR", message: `Validation API returned ${resp.status}` }],
      };
    }

    return await resp.json();
  } catch (err) {
    return {
      approved: false,
      violations: [{ severity: "critical", rule: "API_UNREACHABLE", message: (err as Error).message }],
    };
  }
}

// Full validation pipeline
export async function validateMarket(market: MarketQuestion): Promise<ValidationResult> {
  // Local checks first (fast)
  const local = localValidate(market);
  if (!local.approved) return local;

  // Remote validation (authoritative)
  const remote = await remoteValidate(market);

  // Merge results
  return {
    approved: local.approved && remote.approved,
    violations: [...local.violations, ...remote.violations],
  };
}
