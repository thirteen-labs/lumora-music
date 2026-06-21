
export interface ClusteredFile {
  name: string;
  uri: string;
  size: number;
}

export interface FileCluster {
  id: string;
  name: string;
  files: ClusteredFile[];
}

/**
 * Groups files that share a significant common prefix.
 * If 2 or more files share a prefix (min 4 chars), they are packed into a FileCluster.
 */
export function clusterFiles(files: ClusteredFile[]): (ClusteredFile | FileCluster)[] {
  if (files.length <= 1) return files;

  const result: (ClusteredFile | FileCluster)[] = [];
  const groups = new Map<string, ClusteredFile[]>();

  // Extract a meaningful prefix (up to first digit/parenthesis or first 8-12 chars)
  const getPrefix = (name: string) => {
    // Regex matches the start of string until a digit, space+digit, [, (, or -
    const match = name.match(/^[^0-9\[\(\-]+/);
    let prefix = match ? match[0].trim() : name;
    
    // Clean trailing dots/dashes
    prefix = prefix.replace(/[.\-_ ]+$/, '');
    
    return prefix.length >= 4 ? prefix : null;
  };

  const remainingFiles: ClusteredFile[] = [];

  for (const file of files) {
    const prefix = getPrefix(file.name);
    if (prefix) {
      if (!groups.has(prefix)) groups.set(prefix, []);
      groups.get(prefix)!.push(file);
    } else {
      remainingFiles.push(file);
    }
  }

  // Phase 2: Convert groups with >1 file to clusters, others move back to remaining
  for (const [prefix, groupedFiles] of groups.entries()) {
    if (groupedFiles.length > 1) {
      result.push({
        id: `cluster-${prefix}`,
        name: prefix,
        files: groupedFiles
      } as FileCluster);
    } else {
      remainingFiles.push(groupedFiles[0]);
    }
  }

  // Sort and add remaining files
  remainingFiles.sort((a, b) => a.name.localeCompare(b.name));
  result.push(...remainingFiles);

  // Final sort to keep clusters at top or mixed? Let's keep alphabetical.
  return result.sort((a, b) => a.name.localeCompare(b.name));
}
