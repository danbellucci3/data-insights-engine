import { useRef, RefObject } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Image, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  targetRef: RefObject<HTMLDivElement>;
}

export default function DashboardExport({ targetRef }: Props) {
  const { toast } = useToast();

  const capture = async () => {
    if (!targetRef.current) return null;
    return html2canvas(targetRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });
  };

  const exportPNG = async () => {
    try {
      const canvas = await capture();
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `dashboard-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Imagem exportada com sucesso" });
    } catch {
      toast({ title: "Erro ao exportar imagem", variant: "destructive" });
    }
  };

  const exportPDF = async () => {
    try {
      const canvas = await capture();
      if (!canvas) return;
      const imgData = canvas.toDataURL("image/png");
      const imgW = canvas.width;
      const imgH = canvas.height;
      const pdfW = 297; // A4 landscape width mm
      const pdfH = (imgH * pdfW) / imgW;
      const pdf = new jsPDF({ orientation: pdfH > pdfW ? "portrait" : "landscape", unit: "mm", format: [pdfW, pdfH] });
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      pdf.save(`dashboard-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: "PDF exportado com sucesso" });
    } catch {
      toast({ title: "Erro ao exportar PDF", variant: "destructive" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" /> Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportPNG}>
          <Image className="mr-2 h-4 w-4" /> Exportar como PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPDF}>
          <FileText className="mr-2 h-4 w-4" /> Exportar como PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
