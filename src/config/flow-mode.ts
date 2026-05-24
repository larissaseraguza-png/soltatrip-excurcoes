// Controla se o fluxo de login/cadastro está disponível.
// "locked"  → site mostra apenas a landing page; rotas de auth redirecionam para "/".
// "active"  → fluxo normal de login/cadastro habilitado.
export const FLOW_MODE: "locked" | "active" = "locked";

export const isFlowLocked = () => FLOW_MODE === "locked";
