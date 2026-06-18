import { useState } from "react";
import { CircleHelp, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ImportacaoViewProps = {
  onOpenImport: () => void;
};

export function ImportacaoView({ onOpenImport }: ImportacaoViewProps) {
  const [tutorialOpen, setTutorialOpen] = useState(false);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Importação de Arquivos</h2>
          <p className="text-sm text-muted-foreground">Selecione o tipo de arquivo e siga os campos obrigatórios para iniciar a conferência.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTutorialOpen(true)} className="w-full sm:w-auto">
          <CircleHelp className="h-4 w-4 mr-2" /> Tutorial RFT006
        </Button>
      </div>

      <Dialog open={tutorialOpen} onOpenChange={setTutorialOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto sm:w-full">
          <DialogHeader>
            <DialogTitle>Como gerar o relatório RFT006</DialogTitle>
            <DialogDescription>Use estes filtros no ERP antes de exportar o relatório RFT006 para Excel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Mantém a referência direta à imagem em public/ para evitar nova rota ou alteração no fluxo de importação. */}
            <div className="overflow-x-auto rounded-md border">
              <img
                src="/Tutorial_RFT006.png"
                alt="Filtros recomendados no ERP para gerar o relatório RFT006"
                className="h-auto max-h-[65vh] min-w-[720px] w-full object-contain"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Importante: este tutorial mostra apenas os filtros recomendados para gerar o RFT006. A validação do arquivo continua sendo feita automaticamente pelo sistema na importação.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <h3 className="font-medium">Importação SEFAZ</h3>
          <p className="text-sm text-muted-foreground mt-1">Obrigatórios: XML/relatório SEFAZ, período e destinatário.</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-medium">Importação RFT006/ERP</h3>
          <p className="text-sm text-muted-foreground mt-1">Obrigatórios: relatório RFT006 em Excel compatível e período equivalente ao lote SEFAZ.</p>
        </Card>
      </div>
      <Button onClick={onOpenImport}>
        <Upload className="h-4 w-4 mr-2" /> Abrir modal de importação
      </Button>
    </Card>
  );
}
