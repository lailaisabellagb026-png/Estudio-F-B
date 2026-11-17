import "server-only";
import { diasEntre, horaParaMinutos, somarDias } from "@/lib/horariosAtendimento";
import { avisoLembreteProximo, avisoLembreteVespera } from "@/lib/mensagens";
import { agoraNoEstudio } from "@/lib/tempo";
import { ativosNasDatas, concluirDiasAnteriores, marcarLembrete } from "./agendamentos";
import { avisarEstudio } from "./whatsapp";

// Aviso de véspera: sai uma vez no dia anterior, entre 8h e 21h, com o link
// pronto para lembrar a cliente. Aviso de "daqui a pouco": até 1h30 antes.
const VESPERA_ENTRE = { de: 8 * 60, ate: 21 * 60 };
const PROXIMO_ATE_MIN = 90;

const pausa = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function rodarRotinaDoEstudio() {
  const agora = agoraNoEstudio();
  const amanha = somarDias(agora.data, 1);
  const itens = await ativosNasDatas([agora.data, amanha]);
  const resultado = { avisosDeVespera: 0, avisosDeProximo: 0, falhas: 0 };

  for (const { agendamento, lembreteVespera, lembreteProximo } of itens) {
    const faltamMin =
      diasEntre(agora.data, agendamento.data) * 1440 + horaParaMinutos(agendamento.hora) - agora.minutos;

    const horaDeVespera =
      agendamento.data === amanha && agora.minutos >= VESPERA_ENTRE.de && agora.minutos <= VESPERA_ENTRE.ate;
    if (!lembreteVespera && horaDeVespera) {
      if (await avisarEstudio(avisoLembreteVespera(agendamento))) {
        await marcarLembrete(agendamento.id, "lembreteVespera");
        resultado.avisosDeVespera += 1;
      } else {
        resultado.falhas += 1;
      }
      // A API gratuita do CallMeBot pede um intervalo entre mensagens.
      await pausa(2000);
    }

    if (!lembreteProximo && faltamMin > 0 && faltamMin <= PROXIMO_ATE_MIN) {
      if (await avisarEstudio(avisoLembreteProximo(agendamento))) {
        await marcarLembrete(agendamento.id, "lembreteProximo");
        resultado.avisosDeProximo += 1;
      } else {
        resultado.falhas += 1;
      }
      await pausa(2000);
    }
  }

  const concluidosAutomaticamente = await concluirDiasAnteriores();
  return { ...resultado, concluidosAutomaticamente, horarioDoEstudio: `${agora.data} ${Math.floor(agora.minutos / 60)}h` };
}
