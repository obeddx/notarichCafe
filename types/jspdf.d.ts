declare module "jspdf" {
    interface jsPDF {
      autoTable: (options: {
        head: string[][];
        body: (string | number)[][];
        startY?: number;
        theme?: string;
        styles?: { fontSize: number; cellPadding: number };
        headStyles?: { fillColor: string };
      }) => void;
    }
  }