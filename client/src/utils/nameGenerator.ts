const ADJECTIVES = [
  '聰明的', '勇敢的', '可愛的', '神秘的', '快樂的', '冷靜的', '活潑的', '溫柔的',
  '機智的', '幽默的', '優雅的', '堅強的', '善良的', '創意的', '熱情的', '淡定的',
  '靈巧的', '開朗的', '專注的', '友善的', '樂觀的', '細心的', '大膽的', '謙虛的'
];

const NOUNS = [
  '小貓', '小狗', '小熊', '小兔', '小鳥', '小魚', '小龍', '小虎',
  '獅子', '大象', '熊貓', '企鵝', '海豚', '獨角獸', '鳳凰', '麒麟',
  '忍者', '騎士', '法師', '戰士', '弓箭手', '盜賊', '學者', '探險家',
  '星星', '月亮', '太陽', '彩虹', '閃電', '雲朵', '雪花', '花朵'
];

export const generateRandomNickname = (): string => {
  const randomAdjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const randomNoun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${randomAdjective}${randomNoun}`;
}; 