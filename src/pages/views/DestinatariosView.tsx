import { Card } from "@/components/ui/card";
import { useStore } from "@/store/useStore";
import { DESTINATARIOS_CONHECIDOS } from "@/config/destinatariosConhecidos";
import { normalizeCnpj } from "@/lib/engine";

export function DestinatariosView() {
  const { empresas } = useStore();

  const empresasMap = new Map(
    empresas.map((empresa) => [
      normalizeCnpj(empresa.cnpj),
      {
        apelido: empresa.destinatario_apelido || empresa.nome,
        cpf_cnpj: empresa.cnpj,
        ie: empresa.inscricao_estadual,
        perfil: empresa.perfil,
        tributacao: empresa.tributacao,
        razao_social: empresa.razao_social || empresa.nome,
      },
    ])
  );

  for (const conhecido of DESTINATARIOS_CONHECIDOS) {
    if (!empresasMap.has(conhecido.cpf_cnpj_normalizado)) {
      empresasMap.set(conhecido.cpf_cnpj_normalizado, {
        apelido: conhecido.apelido,
        cpf_cnpj: conhecido.cpf_cnpj,
        ie: conhecido.ie,
        perfil: conhecido.perfil,
        tributacao: conhecido.tributacao,
        razao_social: conhecido.razao_social,
      });
    }
  }

  const destinatarios = Array.from(empresasMap.values()).sort((a, b) => a.apelido.localeCompare(b.apelido));

  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Destinatários SEFAZ</h2>
      <p className="text-sm text-muted-foreground">Cadastro local fixo de destinatários conhecidos (V1 sem banco de dados).</p>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Apelido</th>
              <th className="text-left px-3 py-2 font-medium">CPF/CNPJ</th>
              <th className="text-left px-3 py-2 font-medium">IE</th>
              <th className="text-left px-3 py-2 font-medium">Perfil</th>
              <th className="text-left px-3 py-2 font-medium">Tributação</th>
              <th className="text-left px-3 py-2 font-medium">Razão social</th>
            </tr>
          </thead>
          <tbody>
            {destinatarios.map((item) => (
              <tr key={`${item.apelido}-${item.cpf_cnpj}`} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{item.apelido}</td>
                <td className="px-3 py-2">{item.cpf_cnpj}</td>
                <td className="px-3 py-2">{item.ie || "—"}</td>
                <td className="px-3 py-2">{item.perfil || "—"}</td>
                <td className="px-3 py-2">{item.tributacao || "—"}</td>
                <td className="px-3 py-2">{item.razao_social || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
