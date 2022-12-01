export const isObject = (value) => {
  return typeof value === "object" && value !== null;
};

export const extend = Object.assign;
