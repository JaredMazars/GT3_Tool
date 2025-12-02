import { jsPDF } from 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
}

declare module 'jspdf-autotable' {
  interface CellStyles {
    fillColor?: number[];
    textColor?: number[];
    fontSize?: number;
    fontStyle?: string;
    halign?: 'left' | 'center' | 'right';
    valign?: 'top' | 'middle' | 'bottom';
    cellPadding?: number;
    cellWidth?: number | 'auto' | 'wrap';
  }

  interface UserOptions {
    startY?: number;
    head?: string[][];
    body?: (string | number)[][];
    foot?: string[][];
    theme?: 'striped' | 'grid' | 'plain';
    headStyles?: Partial<CellStyles>;
    footStyles?: Partial<CellStyles>;
    styles?: Partial<CellStyles>;
    columnStyles?: Record<number, Partial<CellStyles>>;
    margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
    pageBreak?: 'auto' | 'avoid' | 'always';
  }

  export default function autoTable(doc: jsPDF, options: UserOptions): void;
}

