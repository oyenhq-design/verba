export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface Block {
  id: string; // Persistent ID mapped back to DOCX XML
  type: "paragraph" | "heading" | "list_item";
  style?: "Heading1" | "Heading2" | "Heading3" | "Normal";
  runs: Run[];
}

export interface Section {
  id: string;
  blocks: Block[];
}

export interface DocumentModel {
  documentId: string;
  title: string;
  sections: Section[];
}

// Issue / Assistant Types
export interface WritingIssue {
  id: string;
  blockId: string;
  startOffset: number;
  endOffset: number;
  issueType: "wordiness" | "formality" | "clarity" | "repetition";
  severity: "low" | "medium" | "high";
  originalText: string;
  explanation: string;
  suggestedText: string;
}
