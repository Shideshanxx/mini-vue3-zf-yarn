import { isObject } from "@vue/shared";
import { mutableHandlers, shallowReactiveHandlers, readonlyHandlers, shallowReadonlyHandlers } from './baseHandlers'
export function reactive(target) {
  return createReactiveObject(target, false, mutableHandlers);
}
export function shallowReactive(target) {
  return createReactiveObject(target, false, shallowReactiveHandlers);
}
export function readonly(target) {
  return createReactiveObject(target, true, readonlyHandlers);
}
export function shallowReadonly(target) {
  return createReactiveObject(target, true, shallowReadonlyHandlers);
}

// WeakMap 存储的key只能是对象，key是对对象的弱引用，会进行垃圾回收，不会造成内存泄漏
// 使用两个 WeakMap 存储 proxy 对象，是因为 readonly 可以处理一个已经经过代理的对象
const reactiveMap = new WeakMap();
const readonlyMap = new WeakMap();
export function createReactiveObject(target, isReadonly, baseHandlers) {
  // reactive 只处理对象
  if (!isObject(target)) {
    return target;
  }
  const proxyMap = isReadonly ? readonlyMap : reactiveMap;
  const existProxy = proxyMap.get(target);
  if (existProxy) {
    return existProxy; // 如果已经代理过了，则直接返回
  }
  const proxy = new Proxy(target, baseHandlers);
  proxyMap.set(target, proxy); // 将要代理的对象和对应的代理结果缓存起来
  return proxy;
}
