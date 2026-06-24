export interface SubtitleCue {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

function timeToMs(timeStr: string): number {
  const parts = timeStr.split(/[:,.]/);
  if (parts.length < 3) return 0;

  const [h, m, sec, ms = '0'] = parts;
  return (
    (parseInt(h, 10) || 0) * 3600000 +
    (parseInt(m, 10) || 0) * 60000 +
    (parseInt(sec, 10) || 0) * 1000 +
    parseInt(ms.padEnd(3, '0'), 10)
  );
}

function parseSRT(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const blocks = content.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    const indexLine = parseInt(lines[0], 10);
    if (isNaN(indexLine)) continue;

    const timeMatch = lines[1].match(
      /(\d{2}:\d{2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{1,3})/,
    );
    if (!timeMatch) continue;

    cues.push({
      index: indexLine,
      startMs: timeToMs(timeMatch[1]),
      endMs: timeToMs(timeMatch[2]),
      text: lines.slice(2).join('\n'),
    });
  }

  return cues;
}

function parseVTT(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const cleaned = content.replace(/^WEBVTT\s*\n.*?(?=\n\n|\n\d)/s, '').trim();
  const blocks = cleaned.split(/\n\s*\n/);
  let index = 1;

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    const timeMatch = lines[0].match(
      /(\d{2}:\d{2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{1,3})/,
    );
    if (!timeMatch) {
      const timeMatch2 = lines[1]?.match(
        /(\d{2}:\d{2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{1,3})/,
      );
      if (!timeMatch2) continue;
      const textStart = 2;
      cues.push({
        index: index++,
        startMs: timeToMs(timeMatch2[1]),
        endMs: timeToMs(timeMatch2[2]),
        text: lines.slice(textStart).join('\n'),
      });
      continue;
    }

    cues.push({
      index: index++,
      startMs: timeToMs(timeMatch[1]),
      endMs: timeToMs(timeMatch[2]),
      text: lines.slice(1).join('\n'),
    });
  }

  return cues;
}

function parseASS(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  let index = 1;

  const eventsMatch = content.match(/\[Events\]\s*\n([\s\S]*?)(?=\n\[|\s*$)/);
  if (!eventsMatch) return [];

  const eventLines = eventsMatch[1].split('\n');
  const formatMatch = content.match(/Format:\s*(.+)/);
  if (!formatMatch) return [];

  const formatColumns = formatMatch[1].split(',').map((c) => c.trim().toLowerCase());

  const startIdx = formatColumns.indexOf('start');
  const endIdx = formatColumns.indexOf('end');
  const textIdx = formatColumns.indexOf('text');
  if (startIdx === -1 || endIdx === -1 || textIdx === -1) return [];

  for (const line of eventLines) {
    if (!line.startsWith('Dialogue:')) continue;
    const parts = line.split(',');
    if (parts.length <= Math.max(startIdx, endIdx, textIdx)) continue;

    const startStr = parts[startIdx]?.trim() ?? '';
    const endStr = parts[endIdx]?.trim() ?? '';
    const text = parts.slice(textIdx).join(',').trim();

    if (!startStr || !endStr || !text) continue;

    cues.push({
      index: index++,
      startMs: assTimeToMs(startStr),
      endMs: assTimeToMs(endStr),
      text: text.replace(/\\N/g, '\n').replace(/\{[^}]*\}/g, ''),
    });
  }

  return cues;
}

function assTimeToMs(timeStr: string): number {
  const parts = timeStr.split(/[:,.]/);
  if (parts.length < 3) return 0;
  const [h, m, sec, ms = '0'] = parts;
  return (
    (parseInt(h, 10) || 0) * 3600000 +
    (parseInt(m, 10) || 0) * 60000 +
    (parseInt(sec, 10) || 0) * 1000 +
    parseInt(ms.padEnd(3, '0'), 10)
  );
}

export function parseSubtitles(content: string, format: 'srt' | 'vtt' | 'ass'): SubtitleCue[] {
  switch (format) {
    case 'srt':
      return parseSRT(content);
    case 'vtt':
      return parseVTT(content);
    case 'ass':
      return parseASS(content);
  }
}
