import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx';
import { OpinionSection } from '@/types';

export interface WordExportOptions {
  title: string;
  sections: OpinionSection[];
  taskName?: string;
  clientName?: string;
}

export class WordExporter {
  /**
   * Generate Word document from opinion sections
   */
  static async generateDocument(options: WordExportOptions): Promise<Buffer> {
    const { title, sections, taskName, clientName } = options;

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Title Page
            new Paragraph({
              text: 'TAX OPINION',
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 400,
              },
            }),
            new Paragraph({
              text: title,
              heading: HeadingLevel.HEADING_2,
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 200,
              },
            }),
            ...(clientName
              ? [
                  new Paragraph({
                    text: `Client: ${clientName}`,
                    alignment: AlignmentType.CENTER,
                    spacing: {
                      after: 100,
                    },
                  }),
                ]
              : []),
            ...(taskName
              ? [
                  new Paragraph({
                    text: `Task: ${taskName}`,
                    alignment: AlignmentType.CENTER,
                    spacing: {
                      after: 100,
                    },
                  }),
                ]
              : []),
            new Paragraph({
              text: new Date().toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 400,
                before: 200,
              },
            }),

            // Page Break
            new Paragraph({
              text: '',
              pageBreakBefore: true,
            }),

            // Table of Contents
            new Paragraph({
              text: 'TABLE OF CONTENTS',
              heading: HeadingLevel.HEADING_1,
              spacing: {
                after: 400,
              },
            }),
            ...sections.map(
              (section, index) =>
                new Paragraph({
                  text: `${index + 1}. ${section.title}`,
                  spacing: {
                    after: 100,
                  },
                })
            ),

            // Page Break
            new Paragraph({
              text: '',
              pageBreakBefore: true,
            }),

            // Sections
            ...this.generateSections(sections),
          ],
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }

  /**
   * Generate Word paragraphs for all sections
   */
  private static generateSections(sections: OpinionSection[]): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    sections.forEach((section, index) => {
      // Section Title
      paragraphs.push(
        new Paragraph({
          text: `${index + 1}. ${section.title.toUpperCase()}`,
          heading: HeadingLevel.HEADING_1,
          spacing: {
            before: index === 0 ? 0 : 400,
            after: 200,
          },
          border: {
            bottom: {
              color: '2E5AAC',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        })
      );

      // Section Content - Split by paragraphs
      const contentParagraphs = section.content.split('\n\n');
      contentParagraphs.forEach((para) => {
        if (para.trim()) {
          paragraphs.push(
            new Paragraph({
              children: this.parseContentWithFormatting(para.trim()),
              spacing: {
                after: 200,
              },
            })
          );
        }
      });

      // Add page break between major sections (except last)
      if (index < sections.length - 1) {
        paragraphs.push(
          new Paragraph({
            text: '',
            pageBreakBefore: true,
          })
        );
      }
    });

    return paragraphs;
  }

  /**
   * Parse content and apply basic formatting
   */
  private static parseContentWithFormatting(text: string): TextRun[] {
    const runs: TextRun[] = [];
    
    // Limit input length to prevent ReDoS
    const safeText = text.substring(0, 50000);
    
    // Simple bold detection (**text** or __text__) with length limits
    const boldRegex = /(\*\*|__)([^*_]{1,1000}?)\1/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(safeText)) !== null) {
      // Add text before bold
      if (match.index > lastIndex) {
        runs.push(
          new TextRun({
            text: safeText.substring(lastIndex, match.index),
          })
        );
      }

      // Add bold text
      runs.push(
        new TextRun({
          text: match[2],
          bold: true,
        })
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      runs.push(
        new TextRun({
          text: text.substring(lastIndex),
        })
      );
    }

    // If no formatting found, return plain text
    if (runs.length === 0) {
      runs.push(new TextRun({ text }));
    }

    return runs;
  }

  /**
   * Export opinion to Word buffer
   */
  static async exportOpinion(
    title: string,
    sections: OpinionSection[],
    metadata?: { taskName?: string; clientName?: string }
  ): Promise<Buffer> {
    return await this.generateDocument({
      title,
      sections: sections.sort((a, b) => a.order - b.order),
      taskName: metadata?.taskName,
      clientName: metadata?.clientName,
    });
  }
}


