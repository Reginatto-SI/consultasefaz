import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DestinatariosView() {
  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Destinatários SEFAZ</h2>
      <p className="text-sm text-muted-foreground">Cadastro de destinatários será implementado na próxima etapa.</p>
      <Button variant="outline">Novo destinatário</Button>
    </Card>
  );
}
