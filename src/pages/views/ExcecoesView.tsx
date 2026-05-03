import { useState } from "react";
import { Ban, FileText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Empresa, Excecao } from "@/lib/types";
import { useStore } from "@/store/useStore";
import { toast } from "sonner";

type ExcecoesViewProps = {
  excecoes: Excecao[];
  empresas: Empresa[];
  onNovaExcecao: () => void;
};

const normalizeChaveNfe = (value: string) => value.replace(/\D/g, "").trim();

export function ExcecoesView({ excecoes, empresas, onNovaExcecao: _onNovaExcecao }: ExcecoesViewProps) {
  const { addExcecao, reverterExcecao } = useStore();
  const [open, setOpen] = useState(false);
  const [empresaId, setEmpresaId] = useState("");
  const [chaveNfe, setChaveNfe] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");

  const handleOpenModal = () => {
    setOpen(true);
  };

  const handleSave = () => {
    if (!empresaId) {
      toast.error("Destinatário é obrigatório.");
      return;
    }
    const chaveNormalizada = normalizeChaveNfe(chaveNfe);
    if (!chaveNormalizada) {
      toast.error("Chave NF-e é obrigatória.");
      return;
    }
    if (!motivo.trim()) {
      toast.error("Motivo é obrigatório.");
      return;
    }

    const ok = addExcecao({
      empresa_id: empresaId,
      chave_nfe: chaveNormalizada,
      motivo: motivo.trim(),
      observacao: observacao.trim() || undefined,
    });

    if (!ok) {
      toast.error("Já existe exceção ativa para este destinatário e chave.");
      return;
    }

    toast.success("Exceção cadastrada localmente.");
    setOpen(false);
    setEmpresaId("");
    setChaveNfe("");
    setMotivo("");
    setObservacao("");
  };

  return (
    <>
      <Card className="p-4 space-y-1">
        <h2 className="text-lg font-semibold">Exceções Operacionais</h2>
        <p className="text-sm text-muted-foreground">Notas desconsideradas manualmente ou tratadas fora da regra automática.</p>
      </Card>
      <Card className="p-3 border-warning/30 bg-warning/5">
        <p className="text-sm text-muted-foreground">
          As exceções são salvas apenas neste navegador. Se os dados do navegador forem limpos, elas poderão ser perdidas.
        </p>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SummaryCard label="Exceções ativas" value={excecoes.filter((e) => e.ativa).length} icon={<Ban className="h-4 w-4" />} tone="warning" />
        <SummaryCard label="Exceções revertidas/futuras" value={excecoes.filter((e) => !e.ativa).length} icon={<FileText className="h-4 w-4" />} tone="muted" />
      </div>
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium">Lista de exceções</h3>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleOpenModal}>Nova exceção</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova exceção operacional</DialogTitle>
                <DialogDescription>Cadastre uma chave para desconsideração local no navegador.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Destinatário *</Label>
                  <Select value={empresaId} onValueChange={setEmpresaId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione um destinatário" />
                    </SelectTrigger>
                    <SelectContent>
                      {empresas.map((empresa) => (
                        <SelectItem key={empresa.id} value={empresa.id}>{empresa.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {empresas.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Importe notas para carregar destinatários antes de cadastrar exceções.
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="chave-nfe">Chave NF-e *</Label>
                  <Input id="chave-nfe" value={chaveNfe} onChange={(e) => setChaveNfe(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="motivo-excecao">Motivo *</Label>
                  <Input id="motivo-excecao" value={motivo} onChange={(e) => setMotivo(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="obs-excecao">Observação</Label>
                  <Textarea id="obs-excecao" value={observacao} onChange={(e) => setObservacao(e.target.value)} className="mt-1" rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={empresas.length === 0}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {excecoes.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center">
            <p className="font-medium">Nenhuma exceção cadastrada.</p>
            <Button className="mt-3" size="sm" variant="outline" onClick={handleOpenModal}>Nova exceção</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Destinatário</th>
                  <th className="text-left px-3 py-2 font-medium">Chave NFe</th>
                  <th className="text-left px-3 py-2 font-medium">Motivo</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {excecoes.map((excecao) => (
                  <tr key={excecao.id} className="border-t border-border">
                    <td className="px-3 py-2">{empresas.find((e) => e.id === excecao.empresa_id)?.nome ?? "Destinatário não identificado"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{excecao.chave_nfe}</td>
                    <td className="px-3 py-2">{excecao.motivo}</td>
                    <td className="px-3 py-2">{excecao.ativa ? "Ativa" : "Revertida"}</td>
                    <td className="px-3 py-2">
                      {excecao.ativa ? (
                        <Button size="sm" variant="outline" onClick={() => reverterExcecao(excecao.id)}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reverter
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function SummaryCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: "warning" | "muted" }) {
  const toneClasses: Record<string, string> = {
    warning: "bg-warning/10 text-warning",
    muted: "bg-muted text-muted-foreground",
  };

  return (
    <Card className="p-3 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-md flex items-center justify-center ${toneClasses[tone]}`}>{icon}</div>
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
      </div>
    </Card>
  );
}
