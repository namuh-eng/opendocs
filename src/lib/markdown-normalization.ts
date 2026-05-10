/**
 * Markdown normalization helpers shared by import, page creation, and render
 * boundaries. Keep this conservative: repair malformed block boundaries without
 * rewriting valid prose or fenced code.
 */

interface NormalizeMarkdownContentOptions {
  /** Known page title. Used to repair a fused first heading, e.g. "# IntroBody". */
  title?: string | null;
}

function normalizeComparable(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findKnownTitleBoundary(text: string, title?: string | null): number {
  const trimmedTitle = title?.trim();
  if (!trimmedTitle) return -1;

  if (!text.startsWith(trimmedTitle)) return -1;

  const remainder = text.slice(trimmedTitle.length);
  if (!remainder) return -1;

  // Only repair a fused title/body boundary. If the next char is already
  // whitespace or punctuation, the heading is intentionally longer.
  if (!/^[A-Z0-9]/.test(remainder)) return -1;

  return trimmedTitle.length;
}

function findCamelParagraphBoundary(text: string): number {
  const boundaryPattern = /[a-z0-9](?=[A-Z][a-z])/g;
  let match: RegExpExecArray | null = boundaryPattern.exec(text);

  while (match) {
    const boundary = match.index + 1;
    const heading = text.slice(0, boundary).trim();
    const paragraph = text.slice(boundary).trim();

    // Avoid changing single-token product/API names such as "OAuthFlow".
    // The generic repair only applies when the likely heading is multi-word
    // and the right side looks like paragraph prose.
    if (heading.includes(" ") && paragraph.includes(" ")) {
      return boundary;
    }

    match = boundaryPattern.exec(text);
  }

  return -1;
}

function splitFusedHeadingLine(
  line: string,
  options: NormalizeMarkdownContentOptions,
): string[] {
  const match = line.match(/^(#{1,6})\s+(.+)$/);
  if (!match) return [line];

  const marker = match[1];
  const text = match[2].trim();
  const knownTitleBoundary = findKnownTitleBoundary(text, options.title);
  const boundary =
    knownTitleBoundary > -1
      ? knownTitleBoundary
      : findCamelParagraphBoundary(text);

  if (boundary === -1) return [line];

  const heading = text.slice(0, boundary).trim();
  const paragraph = text.slice(boundary).trim();
  if (!heading || !paragraph) return [line];

  return [`${marker} ${heading}`, "", paragraph];
}

function repairInlineHeadingMarkers(line: string): string[] {
  return line.replace(/([^#\n])(?=#{1,6}\s+\S)/g, "$1\n\n").split("\n");
}

function ensureBlankLineBeforeHeading(lines: string[]): string[] {
  const output: string[] = [];

  for (const line of lines) {
    if (
      /^#{1,6}\s+\S/.test(line) &&
      output.length > 0 &&
      output[output.length - 1]?.trim()
    ) {
      output.push("");
    }

    output.push(line);
  }

  return output;
}

function ensureBlankLineAfterHeading(lines: string[]): string[] {
  const output: string[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    output.push(line);

    if (
      /^#{1,6}\s+\S/.test(line) &&
      lines[index + 1]?.trim() &&
      !/^#{1,6}\s+\S/.test(lines[index + 1] ?? "")
    ) {
      output.push("");
    }
  }

  return output;
}

/** Normalize markdown block spacing and repair common fused heading/body text. */
export function normalizeMarkdownContent(
  content: string,
  options: NormalizeMarkdownContentOptions = {},
): string {
  if (!content) return "";

  const normalizedTitle = options.title
    ? normalizeComparable(options.title)
    : "";
  const input = content.replace(/\r\n?/g, "\n");
  const repairedLines: string[] = [];
  let inCodeFence = false;

  for (const rawLine of input.split("\n")) {
    const line = rawLine.replace(/[ \t]+$/g, "");
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      repairedLines.push(line);
      inCodeFence = !inCodeFence;
      continue;
    }

    if (inCodeFence) {
      repairedLines.push(line);
      continue;
    }

    for (const segment of repairInlineHeadingMarkers(line)) {
      const titleForSegment =
        normalizedTitle &&
        normalizeComparable(segment).startsWith(normalizedTitle)
          ? options.title
          : undefined;
      repairedLines.push(
        ...splitFusedHeadingLine(segment, { title: titleForSegment }),
      );
    }
  }

  return ensureBlankLineAfterHeading(
    ensureBlankLineBeforeHeading(repairedLines),
  )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
