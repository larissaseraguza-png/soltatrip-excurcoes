import { addNotification, resolveNotifications, type AddInput, type NotifRole } from "./store";

function add(role: NotifRole, n: Omit<AddInput, "role">) {
  addNotification({ ...n, role });
}

/**
 * Resolve (remove) notificações pendentes de uma categoria no role indicado,
 * opcionalmente filtrando pelo nome contido na mensagem. Usado para sincronizar
 * o contador quando a ação relacionada é concluída.
 */
export function resolvePending(
  role: NotifRole,
  opts: { titleIncludes?: string; nomeNaMensagem?: string },
) {
  resolveNotifications(role, (n) => {
    if (opts.titleIncludes && !n.title.toLowerCase().includes(opts.titleIncludes.toLowerCase())) return false;
    if (opts.nomeNaMensagem && !n.message.toLowerCase().includes(opts.nomeNaMensagem.toLowerCase())) return false;
    return true;
  });
}

type Opts = { link?: string; excursao?: string };

export const notify = {
  passageiro: {
    pagamentoAprovado: (msg = "Seu pagamento foi confirmado pelo organizador.", opts: Opts = {}) => {
      resolvePending("passageiro", { titleIncludes: "pendente" });
      add("passageiro", { icon: "credit-card", tone: "green", title: "Pagamento aprovado", message: msg, link: opts.link ?? "/passageiro/pagamentos", category: "pagamentos", excursao: opts.excursao });
    },
    pagamentoPendente: (msg = "Aguardando confirmação do organizador.", opts: Opts = {}) =>
      add("passageiro", { icon: "clock", tone: "amber", title: "Pagamento pendente", message: msg, link: opts.link ?? "/passageiro/pagamentos", category: "pagamentos", excursao: opts.excursao }),
    reservaCriada: (msg = "Sua reserva foi registrada com sucesso.", opts: Opts = {}) =>
      add("passageiro", { icon: "ticket", tone: "purple", title: "Reserva criada", message: msg, link: opts.link ?? "/passageiro", category: "reservas", excursao: opts.excursao }),
    qrLiberado: (msg = "Seu QR Code de embarque já está disponível.", opts: Opts = {}) =>
      add("passageiro", { icon: "qr-code", tone: "green", title: "QR Code liberado", message: msg, link: opts.link ?? "/passageiro/ticket", category: "reservas", excursao: opts.excursao }),
    alteracaoEmbarque: (msg = "Houve uma alteração no seu ponto de embarque.", opts: Opts = {}) =>
      add("passageiro", { icon: "bus", tone: "blue", title: "Alteração de embarque", message: msg, link: opts.link ?? "/passageiro/informacoes", category: "embarque", excursao: opts.excursao }),
    excursaoAtualizada: (msg = "O organizador atualizou informações da excursão.", opts: Opts = {}) =>
      add("passageiro", { icon: "calendar", tone: "blue", title: "Excursão atualizada", message: msg, link: opts.link ?? "/passageiro", category: "alteracoes", excursao: opts.excursao }),
  },
  staff: {
    novoPassageiro: (nome: string, opts: Opts = {}) =>
      add("staff", { icon: "user-plus", tone: "purple", title: "Novo passageiro", message: `${nome} entrou na lista.`, link: opts.link ?? "/staff/passageiros", category: "staff", excursao: opts.excursao }),
    checkinFeito: (nome: string, opts: Opts = {}) =>
      add("staff", { icon: "check-circle", tone: "green", title: "Check-in realizado", message: `${nome} embarcou.`, link: opts.link ?? "/staff/checkin", category: "checkin", excursao: opts.excursao }),
    desembarqueFeito: (nome: string, opts: Opts = {}) =>
      add("staff", { icon: "log-out", tone: "pink", title: "Desembarque realizado", message: `${nome} desembarcou.`, link: opts.link ?? "/staff/checkin", category: "checkin", excursao: opts.excursao }),
    alteracaoEmbarque: (msg = "Um ponto de embarque foi atualizado.", opts: Opts = {}) =>
      add("staff", { icon: "bus", tone: "blue", title: "Alteração de embarque", message: msg, link: opts.link ?? "/staff/onibus", category: "embarque", excursao: opts.excursao }),
    alteracaoExcursionista: (msg = "O excursionista fez alterações na excursão.", opts: Opts = {}) =>
      add("staff", { icon: "edit", tone: "amber", title: "Alteração do organizador", message: msg, link: opts.link ?? "/staff", category: "alteracoes", excursao: opts.excursao }),
  },
  excursionista: {
    novaReserva: (nome: string, opts: Opts = {}) =>
      add("excursionista", { icon: "ticket", tone: "purple", title: "Nova reserva", message: `${nome} reservou uma vaga.`, link: opts.link ?? "/app/pendentes", category: "reservas", excursao: opts.excursao }),
    pagamentoConfirmado: (nome: string, opts: Opts = {}) =>
      add("excursionista", { icon: "credit-card", tone: "green", title: "Pagamento confirmado", message: `${nome} teve o pagamento confirmado.`, link: opts.link ?? "/app/pendentes", category: "pagamentos", excursao: opts.excursao }),
    pagamentoPendente: (nome: string, opts: Opts = {}) =>
      add("excursionista", { icon: "clock", tone: "amber", title: "Pagamento pendente", message: `${nome} enviou um pagamento para conferência.`, link: opts.link ?? "/app/pendentes", category: "pagamentos", excursao: opts.excursao }),
    checkinFeito: (nome: string, opts: Opts = {}) =>
      add("excursionista", { icon: "check-circle", tone: "green", title: "Check-in realizado", message: `${nome} embarcou.`, link: opts.link ?? "/app", category: "checkin", excursao: opts.excursao }),
    alteracaoStaff: (msg = "Um membro da staff fez alterações.", opts: Opts = {}) =>
      add("excursionista", { icon: "edit", tone: "blue", title: "Alteração da staff", message: msg, link: opts.link ?? "/app/historico", category: "alteracoes", excursao: opts.excursao }),
    alteracaoSocio: (msg = "Um sócio fez alterações.", opts: Opts = {}) =>
      add("excursionista", { icon: "edit", tone: "blue", title: "Alteração do sócio", message: msg, link: opts.link ?? "/app/historico", category: "socio", excursao: opts.excursao }),
    novoStaff: (nome: string, opts: Opts = {}) =>
      add("excursionista", { icon: "shield", tone: "purple", title: "Novo staff", message: `${nome} entrou na equipe.`, link: opts.link ?? "/app/perfil", category: "staff", excursao: opts.excursao }),
    novoSocio: (nome: string, opts: Opts = {}) =>
      add("excursionista", { icon: "users", tone: "purple", title: "Novo sócio", message: `${nome} é agora seu sócio.`, link: opts.link ?? "/app/perfil", category: "socio", excursao: opts.excursao }),
  },
};
