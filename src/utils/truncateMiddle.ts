export const truncateMiddle = (value: string, head = 3, tail = 3) => {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
};
