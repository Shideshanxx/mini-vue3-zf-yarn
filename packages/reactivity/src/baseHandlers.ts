import { extend, isObject } from "@vue/shared";
import { reactive, readonly } from "./reactive";
function createGetter(isReadonly = false, shallow = false) {
  // receiver 是代理对象，即 proxy 对象
  return function get(target, key, receiver) {
    /**
     * Reflect 的优势：
     * 1. 后续 Object 上的方法都会被迁移到 Reflect 上，例如 Object.getPrototypeof()
     * 2. 通过 target[key] = value 修改失败不会报错，而 Reflect.set 有返回值，可以判断是否修改成功
     * 3. Reflect 方法具备返回值
     */
    const res = Reflect.get(target, key, receiver);
    if (!isReadonly) {
      // TODO。。。收集依赖
    }
    if (shallow) {
      return res;
    }
    if (isObject(res)) {
      // 【***】vue3 当取值时才进行递归处理子属性，而vue2是在初始化时就一次性递归到底对对象所有层级的属性进行代理
      return isReadonly ? readonly(res) : reactive(res);
    }
    return res;
  };
}
function createSetter(shallow = false) {
  return function set(target, key, value, receiver) {
    const result = Reflect.set(target, key, value, receiver);
    return result;
  };
}

const get = createGetter();
const shallowGet = createGetter(false, true);
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);

const set = createSetter();
const shallowSet = createSetter(true);

export const mutableHandlers = {
  get,
  set,
};
export const shallowReactiveHandlers = {
  get: shallowGet,
  set: shallowSet,
};

let readonlyObj = {
  set: (target, key) => {
    console.warn(`set on key ${key} failed`);
  },
};
export const readonlyHandlers = extend(
  {
    get: readonlyGet,
  },
  readonlyObj
);
export const shallowReadonlyHandlers = extend(
  {
    get: shallowReadonlyGet,
  },
  readonlyObj
);
