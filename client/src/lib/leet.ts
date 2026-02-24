/**
 * Converts text into Leetspeak per requirements: 
 * A->4, E->3, I->1, O->0, S->5, T->7
 */
export function leet(text?: string | null): string {
  if (!text) return '';
  const map: Record<string, string> = {
    'a': '4', 'A': '4',
    'e': '3', 'E': '3',
    'i': '1', 'I': '1',
    'o': '0', 'O': '0',
    's': '5', 'S': '5',
    't': '7', 'T': '7'
  };
  return text.replace(/[aeiostAEIOST]/g, (match) => map[match]);
}
