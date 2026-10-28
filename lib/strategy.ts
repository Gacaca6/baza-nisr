import type { Language } from "./domain";

// Quoted from the National Strategy for Transformation (NST2) 2024/25–2029/30, retrieved from
// minecofin.gov.rw on 2026-10-28. The quotations stay in the English original on purpose: they are
// citations, and translating them here would put words in the Government's mouth that we did not
// check. Locators give the printed page first and the PDF page second, as everywhere else.
export const NST2_URL =
  "https://www.minecofin.gov.rw/index.php?eID=dumpFile&t=f&f=112650&token=cb55b3319372c3f73528c46433b587ef72e8d4eb";

export const strategy: Record<Language, { title: string; intro: string; note: string; items: { quote: string; locator: string; relevance: string }[] }> = {
  en: {
    title: "Where this sits in national strategy",
    intro: "The hackathon theme is poverty reduction and open innovation. These are the aims the tool is built to serve, in the Government's own words.",
    note: "Quotations are from the English original of NST2; locators give the printed page and the PDF page.",
    items: [
      { quote: "Rwanda's Vision 2050 aspires to elevate the nation to upper-middle-income status by 2035 and high-income status by 2050 through achieving sustainable economic growth and ensuring a high-quality life for all Rwandans.", locator: "NST2, printed p.4 · PDF 6", relevance: "Poverty and employment are the measures that show whether that trajectory is holding. Baza puts the current published figure, its reference period and its denominator in front of anyone who asks, in the language they choose." },
      { quote: "Generating high-quality and timely data will support evidence-based decision-making in planning, budgeting, monitoring and evaluation.", locator: "NST2, printed p.32 · PDF 34", relevance: "Evidence-based planning fails at the point of access, not the point of publication. Every answer here carries the table and page it came from, so a planner can cite it and a critic can check it." },
      { quote: "The systems supporting NST2 implementation will rely on technology, data, and evidence-based decision-making.", locator: "NST2, printed p.39 · PDF 41", relevance: "The widget and the JSON contract exist so this reaches the systems already in use: one script tag on an existing government page, or a documented endpoint for a tool that already speaks HTTP." },
    ],
  },
  rw: {
    title: "Aho uyu mushinga uherereye mu migambi y'igihugu",
    intro: "Insanganyamatsiko ya hackathon yibanda ku kugabanya ubukene no ku mhinduro nshya. Iyi ni yo ntego igikoresho cyubatswe iha agaciro, mu magambo ya Guverinoma ubwayo.",
    note: "Ibyasubiwemo bifatwe mu Cyongereza nk'uko byanditswe. Imyandikire y'impapuro itanga urupapuro rwacapwe n'urwa PDF.",
    items: [
      { quote: "Rwanda's Vision 2050 aspires to elevate the nation to upper-middle-income status by 2035 and high-income status by 2050 through achieving sustainable economic growth and ensuring a high-quality life for all Rwandans.", locator: "NST2, printed p.4 · PDF 6", relevance: "Ubukene n'imirimo ni byo bipimo byerekana niba iyo nzira ihagaze. Baza itanga igipimo cyashyizwe ahagaragara, igihe cyacyo n'umubare ugereranywaho, mu rurimi umuntu ahisemo." },
      { quote: "Generating high-quality and timely data will support evidence-based decision-making in planning, budgeting, monitoring and evaluation.", locator: "NST2, printed p.32 · PDF 34", relevance: "Gufata ibyemezo bishingiye ku bushakashatsi bigorana aho amakuru abonerwa, atari aho asohokera. Buri gisubizo kigendana n'imbonerahamwe n'urupapuro byakomotseho, ku buryo ushobora kubisubiramo ukabigenzura." },
      { quote: "The systems supporting NST2 implementation will rely on technology, data, and evidence-based decision-making.", locator: "NST2, printed p.39 · PDF 41", relevance: "Widget na API biri kugira ngo ibi bigere ku buryo Leta isanzwe ikoresha: umurongo umwe wa script ku rubuga rwa Leta, cyangwa inzira ya JSON yanditse." },
    ],
  },
  fr: {
    title: "Ce que cela sert dans la stratégie nationale",
    intro: "Le thème du hackathon couvre la pauvreté et l'innovation ouverte. Voici les objectifs que l'outil doit servir, dans les termes du Gouvernement.",
    note: "Les citations proviennent de l'original anglais de la NST2 ; les repères indiquent la page imprimée et la page PDF.",
    items: [
      { quote: "Rwanda's Vision 2050 aspires to elevate the nation to upper-middle-income status by 2035 and high-income status by 2050 through achieving sustainable economic growth and ensuring a high-quality life for all Rwandans.", locator: "NST2, printed p.4 · PDF 6", relevance: "La pauvreté et l'emploi mesurent si cette trajectoire tient. Baza donne la valeur publiée, sa période de référence et son dénominateur, dans la langue choisie." },
      { quote: "Generating high-quality and timely data will support evidence-based decision-making in planning, budgeting, monitoring and evaluation.", locator: "NST2, printed p.32 · PDF 34", relevance: "La décision fondée sur des preuves échoue à l'accès, pas à la publication. Chaque réponse porte le tableau et la page d'origine, donc elle est citable et vérifiable." },
      { quote: "The systems supporting NST2 implementation will rely on technology, data, and evidence-based decision-making.", locator: "NST2, printed p.39 · PDF 41", relevance: "Le widget et le contrat JSON existent pour rejoindre les systèmes déjà utilisés : une balise script sur une page publique existante, ou un point d'entrée HTTP documenté." },
    ],
  },
};
