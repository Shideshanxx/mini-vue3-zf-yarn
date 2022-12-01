import {
  extend,
  hasChanged,
  hasOwn,
  isArray,
  isIntegerKey,
  isObject,
} from "@vue/shared";
import { track, trigger } from "./effect";
import { TrackOpTypes, TriggerOrTypes } from "./operators";
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
      // 执行effect的fn时会取值，此时将对应的 effect 收集起来
      track(target, TrackOpTypes.GET, key);
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
    const oldValue = target[key]; // 获取老的值
    // 当通过索引修改数组元素时hadKey为true，当通过索引新增数组元素时hadKey为false；当修改对象属性时hadKey为true，当新增对象属性时hadKey为false
    let hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key);
    const result = Reflect.set(target, key, value, receiver); // 修改属性

    // 当数据更新时，通知对应属性的所有 effect 重新执行
    if (!hadKey) {
      // 通过索引新增数组元素，或新增对象属性时
      trigger(target, TriggerOrTypes.ADD, key, value);
    } else if (hasChanged(oldValue, value)) {
      // 通过索引修改数组元素，或修改对象属性和数组length时
      trigger(target, TriggerOrTypes.SET, key, value, oldValue);
    }

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
