import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

interface ProjectContext {
  working_title?: string | null;
  work_type?: string | null;
  field?: string | null;
  topic?: string | null;
  problem?: string | null;
  aim?: string | null;
  objectives?: string[];
  scope?: string | null;
  methodology?: string | null;
  tools?: string[];
  geography?: string | null;
  citation_style?: string | null;
  economic_analysis?: boolean | null;
  focus?: string | null;
  constraints?: string[];
  context_summary?: string | null;
  planned_sections?: string[];
  [key: string]: unknown;
}

type TiptapNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
};

function extractTextFromNodes(nodes: TiptapNode[]): string {
  let text = '';
  for (const node of nodes) {
    if (node.text) {
      text += node.text + ' ';
    }
    if (node.content) {
      text += extractTextFromNodes(node.content) + ' ';
    }
  }
  return text;
}

export async function POST(
  req: Request,
  { params }: { params: { workId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workId } = params;

    // Load work
    const { data: work, error: workError } = await supabase
      .from('works')
      .select('*')
      .eq('id', workId)
      .eq('user_id', user.id)
      .single();

    if (workError || !work) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    // Idempotency: Check if a document already exists for this work
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('id')
      .eq('work_id', workId)
      .limit(1)
      .single();

    if (existingDoc) {
      // If document already exists, return its ID and ensure work stage is updated
      if (work.stage !== 'writing') {
        await supabase
          .from('works')
          .update({ stage: 'writing', updated_at: new Date().toISOString() })
          .eq('id', workId);
      }
      return NextResponse.json({ documentId: existingDoc.id });
    }

    const context: ProjectContext = work.context || {};
    
    // Determine title
    const docTitle = context.working_title || work.title || 'Untitled Document';

    // Map content nodes
    const contentNodes: TiptapNode[] = [];
    
    const addHeading = (headingText: string, level: number = 1) => {
      contentNodes.push({
        type: 'heading',
        attrs: { level },
        content: [{ type: 'text', text: headingText }]
      });
    };

    const addParagraph = (text?: string) => {
      if (text) {
        contentNodes.push({ type: 'paragraph', content: [{ type: 'text', text }] });
      } else {
        contentNodes.push({ type: 'paragraph' });
      }
    };

    addHeading(docTitle, 1);
    addParagraph();

    // Build the structure based on context
    let mainSections: string[] = [];
    if (context.planned_sections && Array.isArray(context.planned_sections) && context.planned_sections.length > 0) {
      mainSections = [...context.planned_sections];
    } else {
      const typeStr = (context.work_type || '').toLowerCase();
      
      if (typeStr.includes('final') || typeStr.includes('research project') || typeStr.includes('dissertation')) {
        mainSections = ['Introduction', 'Literature Review', 'Methodology', 'Results and Discussion', 'Conclusion and Recommendations'];
      } else if (typeStr.includes('research paper')) {
        mainSections = ['Abstract', 'Introduction', 'Background / Related Work', 'Methodology', 'Results', 'Discussion', 'Conclusion', 'References'];
      } else if (typeStr.includes('technical report')) {
        mainSections = ['Introduction', 'Background', 'Method / Approach', 'Findings / Results', 'Discussion', 'Conclusion', 'Recommendations'];
      } else if (typeStr.includes('assignment') || typeStr.includes('essay')) {
        mainSections = ['Introduction', 'Main Discussion', 'Conclusion', 'References'];
      } else {
        mainSections = ['Introduction', 'Main Section', 'Conclusion'];
      }
    }

    const introIndex = mainSections.findIndex(s => s.toLowerCase().includes('intro')) >= 0 
      ? mainSections.findIndex(s => s.toLowerCase().includes('intro')) 
      : 0;

    let methodologyAdded = false;

    mainSections.forEach((sectionTitle, index) => {
      addHeading(sectionTitle, 1);
      
      if (index === introIndex) {
        addParagraph();
        
        if (context.problem) {
          addHeading('Problem Statement', 2);
          addParagraph(context.problem);
        }
        if (context.aim) {
          addHeading('Aim', 2);
          addParagraph(context.aim);
        }
        if (context.objectives && context.objectives.length > 0) {
          addHeading('Objectives', 2);
          const listItems = context.objectives.map(obj => ({
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: obj }] }]
          }));
          contentNodes.push({ type: 'orderedList', content: listItems });
        }
        if (context.scope) {
          addHeading('Scope', 2);
          addParagraph(context.scope);
        }
        
        // If there's no dedicated methodology section, we append it here
        if (context.methodology && !mainSections.some(s => s.toLowerCase().includes('method'))) {
          addHeading('Methodology', 2);
          addParagraph(context.methodology);
          methodologyAdded = true;
        }
      } else if (sectionTitle.toLowerCase().includes('method') && context.methodology && !methodologyAdded) {
        addParagraph(context.methodology);
        methodologyAdded = true;
      } else {
        addParagraph();
      }
    });

    const editorState = {
      type: 'doc',
      content: contentNodes
    };

    const fullText = extractTextFromNodes(contentNodes);
    const wordCount = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;

    // Generate parsedContent fallback matching typical schema
    const parsedContent = {
      sections: [
        {
          id: crypto.randomUUID(),
          title: docTitle,
          level: 1,
          blocks: [
            {
              id: crypto.randomUUID(),
              type: 'paragraph',
              content: ''
            }
          ]
        }
      ]
    };

    const documentId = crypto.randomUUID();

    const newDocument = {
      id: documentId,
      user_id: user.id,
      work_id: workId,
      title: docTitle,
      original_filename: '',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_size: 0,
      storage_path: '',
      status: 'ready',
      word_count: wordCount,
      editor_version: 1,
      editor_state: editorState,
      parsed_content: parsedContent
    };

    const { error: dbError } = await supabase
      .from('documents')
      .insert(newDocument);

    if (dbError) {
      console.error('Database insertion error:', dbError);
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
    }

    // Transition work stage to writing
    await supabase
      .from('works')
      .update({ stage: 'writing', updated_at: new Date().toISOString() })
      .eq('id', workId);

    return NextResponse.json({ documentId });
  } catch (error) {
    console.error('Error in build-document:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
