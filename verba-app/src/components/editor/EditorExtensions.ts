import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { v4 as uuidv4 } from 'uuid';

export interface IssueProp {
  id: string;
  block_id: string;
  start_offset: number;
  end_offset: number;
  status: string;
  original_text: string;
}

export interface IssueHighlightOptions {
  issues: IssueProp[];
  selectedIssueId: string | null;
  onIssueSelect: (issueId: string | null) => void;
}

// Extension to ensure every paragraph and heading has a verbaBlockId
export const VerbaBlockId = Extension.create({
  name: 'verbaBlockId',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          verbaBlockId: {
            default: null,
            parseHTML: element => element.getAttribute('data-verba-block-id'),
            renderHTML: attributes => {
              if (!attributes.verbaBlockId) {
                return {};
              }
              return {
                'data-verba-block-id': attributes.verbaBlockId,
              };
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('verbaBlockIdGenerator'),
        appendTransaction: (transactions, oldState, newState) => {
          // If the document hasn't changed, do nothing
          if (!transactions.some(tr => tr.docChanged)) {
            return null;
          }

          let modified = false;
          const tr = newState.tr;

          newState.doc.descendants((node, pos) => {
            if (node.type.name === 'paragraph' || node.type.name === 'heading') {
              if (!node.attrs.verbaBlockId) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  verbaBlockId: `block-${uuidv4()}`
                });
                modified = true;
              }
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});

export const IssueHighlight = Extension.create<IssueHighlightOptions>({
  name: 'issueHighlight',

  addOptions() {
    return {
      issues: [],
      selectedIssueId: null,
      onIssueSelect: () => {},
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('issueHighlight'),
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply: (tr, value) => {
            return value; // The actual decorations are recomputed in props.decorations
          },
        },
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = [];
            const issues = this.options.issues;
            const selectedId = this.options.selectedIssueId;

            if (!issues || issues.length === 0) {
              return DecorationSet.empty;
            }

            // Create a mapping of blockId -> node start position
            const blockPositions = new Map<string, { start: number, text: string }>();
            
            state.doc.descendants((node, pos) => {
              if ((node.type.name === 'paragraph' || node.type.name === 'heading') && node.attrs.verbaBlockId) {
                blockPositions.set(node.attrs.verbaBlockId, {
                  start: pos + 1, // +1 to get inside the block node
                  text: node.textContent,
                });
              }
            });

            for (const issue of issues) {
              if (issue.status !== 'open') continue;
              
              const blockData = blockPositions.get(issue.block_id);
              if (!blockData) continue; // Block was deleted or missing

              // Stale check
              const textSlice = blockData.text.substring(issue.start_offset, issue.end_offset);
              if (textSlice !== issue.original_text) {
                // Text has changed, issue is stale. Do not highlight.
                continue;
              }

              const from = blockData.start + issue.start_offset;
              const to = blockData.start + issue.end_offset;

              const isSelected = issue.id === selectedId;
              const className = isSelected 
                ? 'bg-amber-200 border-b-2 border-amber-400 cursor-pointer transition-colors' 
                : 'bg-amber-100 hover:bg-amber-200 cursor-pointer transition-colors';

              decorations.push(
                Decoration.inline(from, to, {
                  class: className,
                  'data-issue-id': issue.id,
                })
              );
            }

            return DecorationSet.create(state.doc, decorations);
          },
          handleClick: (view, pos, event) => {
            const target = event.target as HTMLElement;
            const issueId = target.getAttribute('data-issue-id');
            
            if (issueId) {
              this.options.onIssueSelect(issueId);
              return true;
            }
            
            return false;
          }
        },
      }),
    ];
  },
});
