export const playlist = state => {
  const items = [...state.playlist].sort(({ updatedAt: a = 0 }, { updatedAt: b = 0 }) => {
    return b - a;
  });
  return items;
};
export const downloadInfo = state => state.downloadInfo;
