export const isObject = (value) => {
  return typeof value === "object" && value !== null;
};
export const extend = Object.assign;
export const isArray = Array.isArray;
export const isFunction = (value) => typeof value === "function";
export const isNumber = (value) => typeof value === "number";
export const isString = (value) => typeof value === "string";
// 是否是整数
export const isIntegerKey = (key) => parseInt(key) + "" === key;
export const hasOwn = (target, key) => {
  return Object.prototype.hasOwnProperty.call(target, key);
};
export const hasChanged = (oldValue, value) => oldValue !== value;
