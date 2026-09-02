import { DocumentModel, WritingIssue } from "@/types/document";

export const mockDocument: DocumentModel = {
  documentId: "mock-doc-123",
  title: "Engineering Optimization Report",
  sections: [
    {
      id: "sec-1",
      blocks: [
        {
          id: "blk-1",
          type: "heading",
          style: "Heading1",
          runs: [{ text: "Executive Summary" }]
        },
        {
          id: "blk-2",
          type: "paragraph",
          style: "Normal",
          runs: [
            { text: "This report outlines the " },
            { text: "proposed architectural changes", bold: true },
            { text: " for the next quarter. It is imperative to acknowledge that the implementation of this methodology facilitates enhanced operational throughput across all major organizational sectors." }
          ]
        },
        {
          id: "blk-3",
          type: "heading",
          style: "Heading2",
          runs: [{ text: "Background Context" }]
        },
        {
          id: "blk-4",
          type: "paragraph",
          style: "Normal",
          runs: [
            { text: "Previously, our systems were experiencing a non-trivial amount of latency due to the legacy monolithic architecture. We decided to evaluate microservices based on recommendations from " },
            { text: "Smith et al. (2025)", italic: true },
            { text: "." }
          ]
        }
      ]
    }
  ]
};

export const mockIssues: WritingIssue[] = [
  {
    id: "issue-1",
    blockId: "blk-2",
    startOffset: 77, // Corresponds roughly to "It is imperative to acknowledge that..."
    endOffset: 202,
    issueType: "wordiness",
    severity: "high",
    originalText: "It is imperative to acknowledge that the implementation of this methodology facilitates enhanced operational throughput across all major organizational sectors.",
    explanation: "This sentence expresses a simple idea using unnecessarily complex language and corporate jargon.",
    suggestedText: "This approach also improves efficiency across major departments."
  }
];
