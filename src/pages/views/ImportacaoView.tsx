import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ImportacaoViewProps = {
  onOpenImport: () => void;
};

export function ImportacaoView({ onOpenImport }: ImportacaoViewProps) {
  return (
    <Card className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Importação de Arquivos</h2>
      <p className="text-sm text-muted-foreground">Selecione o tipo de arquivo e siga os campos obrigatórios para iniciar a conferência.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <h3 className="font-medium">Importação SEFAZ</h3>
          <p className="text-sm text-muted-foreground mt-1">Obrigatórios: XML/relatório SEFAZ, período e destinatário.</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-medium">Importação ERP</h3>
          <p className="text-sm text-muted-foreground mt-1">Obrigatórios: arquivo ERP compatível e período equivalente ao lote SEFAZ.</p>
        </Card>
      </div>
      <Button onClick={onOpenImport}>
        <Upload className="h-4 w-4 mr-2" /> Abrir modal de importação
      </Button>
    </Card>
  );
}
