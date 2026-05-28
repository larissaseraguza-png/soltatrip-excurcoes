import { addNotification, type AddInput, type NotifRole } from "./store";

function add(role: NotifRole, n: Omit<AddInput, "role">) {
  addNotification({ ...n, role });
}

export const notify = {
  passageiro: {
    pagamentoAprovado: (msg = "Seu pagamento foi confirmado pelo organizador.") =>
      add("passageiro", { icon: "credit-card", tone: "green", title: "Pagamento aprovado", message: msg }),
    pagamentoPendente: (msg = "Aguardando confirmação do organizador.") =>
      add("passageiro", { icon: "clock", tone: "amber", title: "Pagamento pendente", message: msg }),
    reservaCriada: (msg = "Sua reserva foi registrada com sucesso.") =>
      add("passageiro", { icon: "ticket", tone: "purple", title: "Reserva criada", message: msg }),
    qrLiberado: (msg = "Seu QR Code de embarque já está disponível.") =>
      add("passageiro", { icon: "qr-code", tone: "green", title: "QR Code liberado", message: msg }),
    alteracaoEmbarque: (msg = "Houve uma alteração no seu ponto de embarque.") =>
      add("passageiro", { icon: "bus", tone: "blue", title: "Alteração de embarque", message: msg }),
    excursaoAtualizada: (msg = "O organizador atualizou informações da excursão.") =>
      add("passageiro", { icon: "calendar", tone: "blue", title: "Excursão atualizada", message: msg }),
  },
  staff: {
    novoPassageiro: (nome: string) =>
      add("staff", { icon: "user-plus", tone: "purple", title: "Novo passageiro", message: `${nome} entrou na lista.` }),
    checkinFeito: (nome: string) =>
      add("staff", { icon: "check-circle", tone: "green", title: "Check-in realizado", message: `${nome} embarcou.` }),
    desembarqueFeito: (nome: string) =>
      add("staff", { icon: "log-out", tone: "pink", title: "Desembarque realizado", message: `${nome} desembarcou.` }),
    alteracaoEmbarque: (msg = "Um ponto de embarque foi atualizado.") =>
      add("staff", { icon: "bus", tone: "blue", title: "Alteração de embarque", message: msg }),
    alteracaoExcursionista: (msg = "O excursionista fez alterações na excursão.") =>
      add("staff", { icon: "edit", tone: "amber", title: "Alteração do organizador", message: msg }),
  },
  excursionista: {
    novaReserva: (nome: string) =>
      add("excursionista", { icon: "ticket", tone: "purple", title: "Nova reserva", message: `${nome} reservou uma vaga.` }),
    pagamentoConfirmado: (nome: string) =>
      add("excursionista", { icon: "credit-card", tone: "green", title: "Pagamento confirmado", message: `${nome} teve o pagamento confirmado.` }),
    pagamentoPendente: (nome: string) =>
      add("excursionista", { icon: "clock", tone: "amber", title: "Pagamento pendente", message: `${nome} enviou um pagamento para conferência.` }),
    checkinFeito: (nome: string) =>
      add("excursionista", { icon: "check-circle", tone: "green", title: "Check-in realizado", message: `${nome} embarcou.` }),
    alteracaoStaff: (msg = "Um membro da staff fez alterações.") =>
      add("excursionista", { icon: "edit", tone: "blue", title: "Alteração da staff", message: msg }),
    alteracaoSocio: (msg = "Um sócio fez alterações.") =>
      add("excursionista", { icon: "edit", tone: "blue", title: "Alteração do sócio", message: msg }),
    novoStaff: (nome: string) =>
      add("excursionista", { icon: "shield", tone: "purple", title: "Novo staff", message: `${nome} entrou na equipe.` }),
    novoSocio: (nome: string) =>
      add("excursionista", { icon: "users", tone: "purple", title: "Novo sócio", message: `${nome} é agora seu sócio.` }),
  },
};
