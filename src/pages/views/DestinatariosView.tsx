import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const formatCpfCnpj = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

export function DestinatariosView() {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [status, setStatus] = useState("Ativo");

  const handleSave = () => {
    // Placeholder visual: nesta etapa não há persistência nem CRUD real para destinatários.
    toast.info("Cadastro de destinatário será implementado em etapa futura.");
    setOpen(false);
    setNome("");
    setCpfCnpj("");
    setStatus("Ativo");
  };

  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Destinatários SEFAZ</h2>
      <p className="text-sm text-muted-foreground">Cadastro de destinatários será implementado na próxima etapa.</p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Novo destinatário</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo destinatário SEFAZ</DialogTitle>
            <DialogDescription>Modal visual temporário para cadastro de destinatário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="destinatario-nome">Nome/Razão social</Label>
              <Input id="destinatario-nome" value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="destinatario-cpf-cnpj">CPF/CNPJ</Label>
              {/* Máscara apenas visual (CPF/CNPJ); validação oficial ficará para etapa futura. */}
              <Input
                id="destinatario-cpf-cnpj"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
