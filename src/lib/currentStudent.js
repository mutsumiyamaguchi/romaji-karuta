// 現在選択中の生徒 ID を localStorage に保持する。
//
// 生徒データ自体は D1 にあるが、「いま誰がプレイしてるか」だけは端末に残しておくほうが
// 子供がメニューに戻るたびに選び直さなくて済む。

const STORAGE_KEY = 'romajiCurrentStudentId';

export const getCurrentStudentId = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
};

export const setCurrentStudentId = (id) => {
  try {
    if (!id) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, id);
    }
  } catch {
    // ignore
  }
};
