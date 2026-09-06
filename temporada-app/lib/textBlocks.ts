export type TextBlock = { type: "paragraph"; text: string } | { type: "list"; items: string[] };

const BULLET_PREFIX = /^[•\-*]\s*/;

/**
 * Converte um texto livre (como vem do campo "Regras da casa" no admin) em
 * blocos de parágrafo/lista. Linhas que já começam com •, - ou * viram
 * itens de lista (com ícone); as demais linhas viram parágrafos normais.
 * Não exige nenhuma mudança no formulário do admin — o dono do imóvel
 * continua digitando texto livre com "•" na frente de cada regra.
 */
export function parseBulletedText(text: string | null | undefined): TextBlock[] {
  if (!text) return [];

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: TextBlock[] = [];
  let currentList: string[] = [];

  function flushList() {
    if (currentList.length > 0) {
      blocks.push({ type: "list", items: currentList });
      currentList = [];
    }
  }

  for (const line of lines) {
    if (BULLET_PREFIX.test(line)) {
      currentList.push(line.replace(BULLET_PREFIX, ""));
    } else {
      flushList();
      blocks.push({ type: "paragraph", text: line });
    }
  }
  flushList();

  return blocks;
}
