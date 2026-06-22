export type Language = 'pt' | 'en';

type TranslationDict = {
  donationDoneTitle: string;
  donationDoneMessage: string;
  donationCanceledTitle: string;
  donationCanceledMessage: string;
  aboutTitle: string;
  aboutDescription: string;
  donateLabel: string;
  pageTitle: string;
  resetButton: string;
  groupLabel: (label: string) => string;
  liveBadge: string;
  simBadge: string;
  colTeam: string;
  colP: string;
  colW: string;
  colD: string;
  colL: string;
  colGD: string;
  colPts: string;
  bestThirdTitle: string;
  colGrp: string;
  colSlot: string;
  eliminated: string;
  knockoutBracketTitle: string;
  roundOf32: string;
  roundOf16: string;
  quarterFinal: string;
  semiFinal: string;
  final: string;
  thirdPlace: string;
  dateLocale: string;
};

export const translations: Record<Language, TranslationDict> = {
  pt: {
    donationDoneTitle: '☕️ Obrigado pelo apoio!',
    donationDoneMessage: 'Sua contribuição ajuda a manter esse projeto vivo. Fico muito grato!',
    donationCanceledTitle: 'Sem problema!',
    donationCanceledMessage: 'Apoio não precisa ser financeiro, compartilhar o projeto também ajuda muito!',
    aboutTitle: 'Sobre',
    aboutDescription: 'Criado por Diego Benetti: desenvolvedor e apaixonado por futebol!',
    donateLabel: 'Se curtiu o projeto, considere apoiar:',
    pageTitle: 'Copa do Mundo 2026 - Simulador',
    resetButton: 'Redefinir classificação',
    groupLabel: (label) => `Grupo ${label}`,
    liveBadge: 'AO VIVO',
    simBadge: 'SIM',
    colTeam: 'Equipe',
    colP: 'P',
    colW: 'V',
    colD: 'E',
    colL: 'D',
    colGD: 'SG',
    colPts: 'Pts',
    bestThirdTitle: 'Melhores Terceiros Colocados',
    colGrp: 'Grp',
    colSlot: 'Slot',
    eliminated: 'eliminado',
    knockoutBracketTitle: 'Fase Eliminatória',
    roundOf32: 'Rodada de 32',
    roundOf16: 'Oitavas de Final',
    quarterFinal: 'Quartas de Final',
    semiFinal: 'Semifinal',
    final: 'Final',
    thirdPlace: '3º Lugar',
    dateLocale: 'pt-BR',
  },
  en: {
    donationDoneTitle: '☕️ Thank you for your support!',
    donationDoneMessage: 'Your contribution helps keep this project running. I truly appreciate it!',
    donationCanceledTitle: 'No worries!',
    donationCanceledMessage: "Thanks for visiting us. Your support doesn't have to be financial, sharing the project means a lot!",
    aboutTitle: 'About',
    aboutDescription: 'Built by Diego Benetti: developer & football fan',
    donateLabel: 'If you enjoy the project, consider supporting it:',
    pageTitle: 'World Cup 2026 - Simulator',
    resetButton: 'Reset standings',
    groupLabel: (label) => `Group ${label}`,
    liveBadge: 'LIVE',
    simBadge: 'SIM',
    colTeam: 'Team',
    colP: 'P',
    colW: 'W',
    colD: 'D',
    colL: 'L',
    colGD: 'GD',
    colPts: 'Pts',
    bestThirdTitle: 'Best Third-Place Teams',
    colGrp: 'Grp',
    colSlot: 'Slot',
    eliminated: 'eliminated',
    knockoutBracketTitle: 'Knockout Bracket',
    roundOf32: 'Round of 32',
    roundOf16: 'Round of 16',
    quarterFinal: 'Quarter-final',
    semiFinal: 'Semi-final',
    final: 'Final',
    thirdPlace: '3rd Place',
    dateLocale: 'en-US',
  },
};
