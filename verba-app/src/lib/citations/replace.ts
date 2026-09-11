/**
 * replace.ts — Safe Citation Node Replacement
 *
 * H2E-4: Provides a Tiptap/ProseMirror command to replace exactly one
 * citation node identified by citationId with a new citation node.
 *
 * This participates in normal Tiptap history → Undo/Redo works automatically.
 * Never uses text search. Matches citation nodes by citationId attribute only.
 */

import { Command } from '@tiptap/core';

/**
 * Returns a Tiptap command that finds the first citation node with
 * `attrs.citationId === oldCitationId` and replaces it with a new
 * citation node using `newCitationId` and `newSourceId`.
 *
 * Usage:
 *   editor.commands.command(buildReplaceCitationCommand(oldId, newId, newSourceId))
 */
export function buildReplaceCitationCommand(
  oldCitationId: string,
  newCitationId: string,
  newSourceId: string
): Command {
  return ({ state, dispatch }) => {
    const { doc, schema, tr } = state;

    // Find the ProseMirror node type named 'citation'
    const citationType = schema.nodes['citation'];
    if (!citationType) {
      console.error('[replace] Citation node type not found in schema');
      return false;
    }

    let found = false;

    doc.descendants((node, pos) => {
      if (found) return false; // Stop traversal after first match
      if (node.type !== citationType) return true; // Continue into children
      if (node.attrs.citationId !== oldCitationId) return true;

      // Found the node — build replacement node
      const newNode = citationType.create({
        citationId: newCitationId,
        sourceId: newSourceId,
      });

      if (dispatch) {
        // tr.replaceWith participates in Tiptap history
        tr.replaceWith(pos, pos + node.nodeSize, newNode);
        dispatch(tr);
      }

      found = true;
      return false; // Stop traversal
    });

    return found;
  };
}

/**
 * Returns a Tiptap command that finds the first citation node with
 * `attrs.citationId === targetCitationId` and inserts a new citation node
 * immediately after it.
 */
export function buildAddSupportingCitationCommand(
  targetCitationId: string,
  newCitationId: string,
  newSourceId: string
): Command {
  return ({ state, dispatch }) => {
    const { doc, schema, tr } = state;
    const citationType = schema.nodes['citation'];
    if (!citationType) return false;

    let found = false;

    doc.descendants((node, pos) => {
      if (found) return false;
      if (node.type !== citationType) return true;
      if (node.attrs.citationId !== targetCitationId) return true;

      const $pos = doc.resolve(pos);
      const parent = $pos.parent;
      let duplicateFound = false;
      
      parent.descendants((child) => {
        if (child.type === citationType && child.attrs.sourceId === newSourceId) {
          duplicateFound = true;
        }
      });

      if (duplicateFound) {
        throw new Error('Already cited here');
      }

      const newNode = citationType.create({
        citationId: newCitationId,
        sourceId: newSourceId,
      });

      if (dispatch) {
        tr.insert(pos + node.nodeSize, newNode);
        // Also insert a space between them for readability
        tr.insert(pos + node.nodeSize, schema.text(' '));
        dispatch(tr);
      }

      found = true;
      return false;
    });

    return found;
  };
}
