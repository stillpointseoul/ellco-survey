export const READING_ATTITUDE_TITLE = "유아 책 읽기태도 질문지";

export const SCALE = {
  values: [1, 2, 3, 4, 5] as const,
  minLabel: "전혀",
  maxLabel: "항상",
};

export type ReadingAttitudeItem = {
  id: string;
  no: number;
  text: string;
};

export type ReadingAttitudeSection = {
  key: "I" | "II" | "III";
  numeral: string;
  title: string;
  items: ReadingAttitudeItem[];
};

function items(key: string, texts: string[]): ReadingAttitudeItem[] {
  return texts.map((text, i) => ({ id: `${key}_${i + 1}`, no: i + 1, text }));
}

export const SECTIONS: ReadingAttitudeSection[] = [
  {
    key: "I",
    numeral: "Ⅰ",
    title: "책에 대한 관심",
    items: items("I", [
      "교사나 유아와 함께 책 읽기활동에 관심을 보인다.",
      "자발적으로 책을 본다.",
      "책이나 읽기에 흥미를 보인다.",
      "성인에게 책을 읽어달라고 한다.",
      "질문에 대한 답을 찾기 위해 책을 이용한다.",
      "새로운 책에 대해 흥미를 보인다.",
    ]),
  },
  {
    key: "II",
    numeral: "Ⅱ",
    title: "책 읽기 행동",
    items: items("II", [
      "책이나 놀잇감 중에 책을 선택한다.",
      "바르게 앉아서 책을 읽는다.",
      "그림보다는 글 위주로 책을 본다.",
      "책을 읽어주는 시간에 집중해서 듣는다.",
      "친구들과 함께 책 읽기를 즐긴다.",
      "같은 책을 반복적으로 즐겨 읽는다.",
    ]),
  },
  {
    key: "III",
    numeral: "Ⅲ",
    title: "책 읽은 후 행동",
    items: items("III", [
      "책을 읽은 후 느낀 점을 자발적으로 이야기를 한다.",
      "자발적으로 책 내용과 관련된 활동을 즐겨한다.",
      "이야기 내용과 자신의 경험을 관련지어 이야기 한다.",
      "이야기 재구성시 글의 구성 요소를 포함한다(배경, 주제, 줄거리, 결론).",
      "이야기 책 읽은 후 단어, 내용의 해석에 관한 생각을 말하거나 질문을 한다.",
      "이야기 책 읽은 후 비판적인 생각을 말하거나 질문을 한다.",
    ]),
  },
];

export const ALL_ITEM_IDS: string[] = SECTIONS.flatMap((s) => s.items.map((i) => i.id));

export const GENDER_OPTIONS = ["남", "여"] as const;
