export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

function parseTime(time: string): number {
  const parts = time.trim().split(':');
  if (parts.length === 3) {
    const [h, m, rest] = parts;
    const [s, ms] = rest.split(',');
    return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms || '0') / 1000;
  } else if (parts.length === 2) {
    const [m, rest] = parts;
    const [s, ms] = rest.split('.');
    return parseInt(m) * 60 + parseInt(s) + parseInt(ms || '0') / 1000;
  }
  return 0;
}

export function parseSRT(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const blocks = content.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    let timeLine = '';
    let textLines: string[] = [];

    for (const line of lines) {
      if (line.includes('-->')) {
        timeLine = line;
      } else if (timeLine && line.trim() && !/^\d+$/.test(line.trim())) {
        textLines.push(line.trim());
      }
    }

    if (timeLine && textLines.length > 0) {
      const [startStr, endStr] = timeLine.split('-->');
      if (startStr && endStr) {
        cues.push({
          start: parseTime(startStr),
          end: parseTime(endStr.split(' ')[0]),
          text: textLines.join('\n'),
        });
      }
    }
  }

  return cues;
}

export function parseVTT(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const lines = content.trim().split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes('-->') && i > 0) {
      const [startStr, endStr] = line.split('-->');
      const textLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].trim());
        i++;
      }
      if (startStr && endStr && textLines.length > 0) {
        cues.push({
          start: parseTime(startStr),
          end: parseTime(endStr.split(' ')[0]),
          text: textLines.join('\n'),
        });
      }
    } else {
      i++;
    }
  }

  return cues;
}

export function getActiveCue(cues: SubtitleCue[], position: number): SubtitleCue | null {
  for (const cue of cues) {
    if (position >= cue.start && position <= cue.end) {
      return cue;
    }
  }
  return null;
}
