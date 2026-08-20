"use strict";

/* ============================================================
   Translations for UI chrome only — suco/admin-post/municipality
   names are proper nouns and are never translated.

   TET is intentionally left as English placeholders (see the big
   comment block at the bottom of this file) for manual translation.
   Until filled in, the app falls back to English automatically for
   any missing TET key, so nothing breaks or shows blank.
   ============================================================ */
const I18N = {
  en: {
    pageTitle: "Timor-Leste Suco Map Quiz",
    leaderboardLink: "🏆 Leaderboard",
    subtitle: "Find every suco (village) in Timor-Leste. Choose a mode to start.",
    toggleClick: "Click the map",
    toggleType: "Type the names",
    modeEasyTitle: "Easy: Municipalities",
    modeEasyDesc: "Just the 13 municipalities — a good warm-up",
    modeCountryTitle: "Whole Country",
    modeCountryDesc: "All 442 sucos across all 13 municipalities",
    modePostsTitle: "Administrative Posts",
    modePostsDesc: "All 65 administrative posts, country-wide",
    modeMuniTitle: "By Municipality",
    modeMuniDesc: "Focus on the sucos of a single municipality",
    disclaimer: "This quiz is based on a pre-2022 administrative boundary dataset. It predates two later changes: Atauro becoming its own municipality (previously part of Dili) in January 2022, and Baucau's Quelicai Administrative Post splitting into Quelicai Antigo and Matebian in January 2024.",
    back: "Back",
    chooseMunicipality: "Choose a municipality",
    quit: "Quit",
    find: "Find:",
    skip: "Skip",
    skipRestOf: "Skip rest of {unit}",
    giveUp: "Give Up",
    resetView: "Reset View",
    resetZoomTooltip: "Reset zoom",
    statCorrect: "Correct",
    statAccuracy: "First-try accuracy",
    statTime: "Time",
    missedHeading: "Missed",
    perfectRun: "None — perfect run!",
    yourNamePlaceholder: "Your name…",
    submitToLeaderboard: "Submit to Leaderboard",
    playAgain: "Play Again",
    viewLeaderboard: "View Leaderboard",
    backToMenu: "Back to Menu",
    leaderboardHeading: "Leaderboard",
    lbToggleClick: "Click",
    lbToggleType: "Type",
    noScoresYet: "No scores yet — be the first!",
    leaderboardNotSetUp: "Leaderboard isn't set up yet.",
    themeDark: "🌙 Dark",
    themeLight: "☀ Light",
    placeholderSuco: "Type a suco name…",
    placeholderPost: "Type an administrative post…",
    placeholderMuni: "Type a municipality…",
    unitAdminPost: "Admin Post",
    unitMunicipality: "Municipality",
    missCount_one: "{n} miss",
    missCount_other: "{n} misses",
    toastGroupComplete: "{group} complete! Next: {next}",
    toastCorrect: "Correct — {name}",
    toastWrongTryAgain: "Not quite — try again",
    toastSkipped: "Skipped — that was {name}",
    toastSkippedGroup: "Skipped rest of {label} — saved for later",
    quizCompleteTitled: "{title} — complete!",
    quizCompleteGeneric: "Quiz complete!",
    pbNew: "🏆 New personal best! {pct}% in {time}",
    pbExisting: "Personal best: {pct}% in {time}",
    enterNameFirst: "Enter a name first",
    submitting: "Submitting…",
    submitted: "✓ Submitted!",
    submitFailed: "Couldn't submit — try again",
    modeTitleWholeCountry: "Whole Country",
    modeTitleAdminPosts: "Administrative Posts",
    modeTitleMunicipalities: "Municipalities",
    sucosWord: "sucos",
  },

  pt: {
    pageTitle: "Quiz do Mapa dos Sucos de Timor-Leste",
    leaderboardLink: "🏆 Classificação",
    subtitle: "Encontre todos os sucos (aldeias) de Timor-Leste. Escolha um modo para começar.",
    toggleClick: "Clicar no mapa",
    toggleType: "Escrever os nomes",
    modeEasyTitle: "Fácil: Municípios",
    modeEasyDesc: "Apenas os 13 municípios — um bom aquecimento",
    modeCountryTitle: "País Inteiro",
    modeCountryDesc: "Todos os 442 sucos nos 13 municípios",
    modePostsTitle: "Postos Administrativos",
    modePostsDesc: "Todos os 65 postos administrativos, em todo o país",
    modeMuniTitle: "Por Município",
    modeMuniDesc: "Foque nos sucos de um único município",
    disclaimer: "Este quiz é baseado num conjunto de dados de limites administrativos anterior a 2022. É anterior a duas mudanças posteriores: Ataúro tornou-se um município próprio (anteriormente parte de Díli) em janeiro de 2022, e o Posto Administrativo de Quelicai, em Baucau, dividiu-se em Quelicai Antigo e Matebian em janeiro de 2024.",
    back: "Voltar",
    chooseMunicipality: "Escolha um município",
    quit: "Sair",
    find: "Encontre:",
    skip: "Saltar",
    skipRestOf: "Saltar o resto de {unit}",
    giveUp: "Desistir",
    resetView: "Repor Vista",
    resetZoomTooltip: "Repor zoom",
    statCorrect: "Corretas",
    statAccuracy: "Precisão à primeira tentativa",
    statTime: "Tempo",
    missedHeading: "Falhadas",
    perfectRun: "Nenhuma — desempenho perfeito!",
    yourNamePlaceholder: "O seu nome…",
    submitToLeaderboard: "Enviar para a Classificação",
    playAgain: "Jogar Novamente",
    viewLeaderboard: "Ver Classificação",
    backToMenu: "Voltar ao Menu",
    leaderboardHeading: "Classificação",
    lbToggleClick: "Clicar",
    lbToggleType: "Escrever",
    noScoresYet: "Ainda sem pontuações — seja o primeiro!",
    leaderboardNotSetUp: "A classificação ainda não está configurada.",
    themeDark: "🌙 Escuro",
    themeLight: "☀ Claro",
    placeholderSuco: "Escreva o nome de um suco…",
    placeholderPost: "Escreva um posto administrativo…",
    placeholderMuni: "Escreva um município…",
    unitAdminPost: "Posto Administrativo",
    unitMunicipality: "Município",
    missCount_one: "{n} erro",
    missCount_other: "{n} erros",
    toastGroupComplete: "{group} completo! A seguir: {next}",
    toastCorrect: "Correto — {name}",
    toastWrongTryAgain: "Quase — tente novamente",
    toastSkipped: "Saltado — era {name}",
    toastSkippedGroup: "Saltado o resto de {label} — guardado para depois",
    quizCompleteTitled: "{title} — completo!",
    quizCompleteGeneric: "Quiz completo!",
    pbNew: "🏆 Novo recorde pessoal! {pct}% em {time}",
    pbExisting: "Recorde pessoal: {pct}% em {time}",
    enterNameFirst: "Introduza um nome primeiro",
    submitting: "A enviar…",
    submitted: "✓ Enviado!",
    submitFailed: "Não foi possível enviar — tente novamente",
    modeTitleWholeCountry: "País Inteiro",
    modeTitleAdminPosts: "Postos Administrativos",
    modeTitleMunicipalities: "Municípios",
    sucosWord: "sucos",
  },

  // TODO(tet): every value below is still the English placeholder.
  // Translate the values (not the keys) and this becomes the Tetun UI.
  // {word} placeholders (e.g. {name}, {n}, {unit}) must stay exactly as
  // written — the app substitutes real values into them at runtime.
  tet: {
    pageTitle: "Ezame Mapa Timor-Leste nian",
    leaderboardLink: "🏆 Klasifikasaun",
    subtitle: "Identifika suku-suku iha Timor-Leste. Hili tiha mode hodi hahú.",
    toggleClick: "Klik mapa",
    toggleType: "Hakerek nia naran",
    modeEasyTitle: "Fasil: Munisípiu",
    modeEasyDesc: "Munisípiu 13 de'it — hodi hamanas an",
    modeCountryTitle: "Nasaun tomak",
    modeCountryDesc: "Suku 442 hotu iha munisípiu 13 hotu kedas",
    modePostsTitle: "Postu Administrativu",
    modePostsDesc: "Postu administrativu 65 hotu iha Timor-Leste",
    modeMuniTitle: "Kada Munisípiu",
    modeMuniDesc: "Foka liu ba suku sira iha munisípiu ida de'it",
    disclaimer: "Mapa ida ne'e bazeia ba dadus husi 2022 ba kotuk, ne'ebé iha momentu ne'ebá Ataúro sei hola parte iha munisípiu Dili (agora nia sai fali munisípiu ketak ida iha fulan Janeiru 2022) no mós Quelicai sei hanesan postu administrativu ida iha Baucau (agora nia fahe tiha ba rua: Quelicai Antigo ho Matebian iha fulan Janeiru 2024)",
    back: "Fila",
    chooseMunicipality: "Hili munisípiu",
    quit: "Sai",
    find: "Buka:",
    skip: "Liu tiha",
    skipRestOf: "Liu tiha {unit} sira seluk",
    giveUp: "Rende",
    resetView: "Reset View",
    resetZoomTooltip: "Reset zoom",
    statCorrect: "Loos",
    statAccuracy: "First-try accuracy",
    statTime: "Oras",
    missedHeading: "Sala",
    perfectRun: "La iha — perfeitu!",
    yourNamePlaceholder: "Ita-nia naran…",
    submitToLeaderboard: "Hatama iha Klasifikasaun",
    playAgain: "Halimar tan",
    viewLeaderboard: "Haree Klasifikasaun",
    backToMenu: "Fila fali ba menu",
    leaderboardHeading: "Klasifikasaun",
    lbToggleClick: "Klik",
    lbToggleType: "Hakerek",
    noScoresYet: "Klasifikasaun seidauk iha — sai primeiru!",
    leaderboardNotSetUp: "Klasifikasaun seidauk halo.",
    themeDark: "🌙 Nakukun",
    themeLight: "☀ Naroman",
    placeholderSuco: "Ketik suku ida nia naran…",
    placeholderPost: "Ketik postu administrativu ida nia naran…",
    placeholderMuni: "Ketik munisípiu ida nia naran…",
    unitAdminPost: "Postu Administrativu",
    unitMunicipality: "Munisípiu",
    missCount_one: "{n} sala",
    missCount_other: "{n} sala",
    toastGroupComplete: "{group} hotu ona! Tuirmai: {next}",
    toastCorrect: "Loos — {name}",
    toastWrongTryAgain: "Sala — koko fali",
    toastSkipped: "Liu ona — ne'e {name}",
    toastSkippedGroup: "Liu ona {label} — orsida mak siik fali",
    quizCompleteTitled: "{title} — hotu-ona!",
    quizCompleteGeneric: "Ezame hotu ona!",
    pbNew: "🏆 Ita hetan boot liu! {pct}% iha {time}",
    pbExisting: "Ita boot nia rezultadu boot liu: {pct}% in {time}",
    enterNameFirst: "Hatama naran tiha lai",
    submitting: "Hatama hela…",
    submitted: "✓ Hatama ona!",
    submitFailed: "Hatama la di'ak — koko fila fali ",
    modeTitleWholeCountry: "Nasaun tomak",
    modeTitleAdminPosts: "Postu Administrativu sira",
    modeTitleMunicipalities: "Munisípiu sira",
    sucosWord: "suku sira",
  },
};

let currentLang = localStorage.getItem("tlq_lang") || "en";

function t(key, params) {
  const dict = I18N[currentLang] || I18N.en;
  let str = dict[key] ?? I18N.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.split(`{${k}}`).join(v);
    }
  }
  return str;
}

function tCount(baseKey, n) {
  return t(n === 1 ? `${baseKey}_one` : `${baseKey}_other`, { n });
}

function applyStaticTranslations() {
  document.title = t("pageTitle");
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.querySelectorAll(".lang-toggle-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });
}
